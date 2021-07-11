import * as crypto from "crypto";
import express from "express";
import expressWs from "express-ws";
import * as util from "util";

import * as DB from "./database";
import * as Mail from "./mail";
import {Communication} from "@thinktool/shared";

import * as Routing from "./routing";
import * as PasswordRecovery from "./password-recovery";

import {spec} from "@johv/miscjs";
import {Spec} from "@johv/miscjs/lib/spec";
const {isValid, $array, $or} = spec;

const $content = $array($or(["string", {link: "string"}] as const));

const staticUrl = process.env.DIAFORM_STATIC_HOST;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection: %o", reason);
});

// #region changes

// We want to be able to subscribe to changes in a user's data. This is used to
// notify a client when a user changes their data in another client.

type ClientId = string;

const changes = (() => {
  type SubscriptionId = number;

  interface Subscription {
    userId: DB.UserId;
    receiver: ClientId;
    callback(thing: string): void;
  }

  let nextId = 0;
  const subscriptions: {[id: number]: Subscription} = {};

  function updated(userId: DB.UserId, thing: string, sender: ClientId): void {
    for (const subscription of Object.values(subscriptions).filter(
      (s) => s.userId.name === userId.name && s.receiver !== sender,
    )) {
      subscription.callback(thing);
    }
  }

  function subscribe(userId: DB.UserId, receiver: ClientId, callback: (thing: string) => void): SubscriptionId {
    const id = nextId++;
    subscriptions[id] = {userId, callback, receiver};
    return id;
  }

  function unsubscribe(subscriptionId: SubscriptionId): void {
    delete subscriptions[subscriptionId];
  }

  return {updated, subscribe, unsubscribe};
})();

// #endregion

function getCookie(cookies: string | undefined, key: string): string | null {
  // TODO: This seems like a really horrible way of doing this.
  if (cookies === undefined) return null;
  const result = cookies.match(new RegExp(`(?:^|;\\s+)${key}=(\\S*)(?:$|;\\s+)`));
  if (result && typeof result[1] === "string") return result[1];
  return null;
}

declare module "express-serve-static-core" {
  interface Request {
    hasSession?: boolean;
    session?: string;
    user?: DB.UserId;
  }
}

function requireSession(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (req.user === undefined) {
    res
      .status(401)
      .type("text/plain")
      .header("Access-Control-Allow-Origin", staticUrl)
      .header("Access-Control-Allow-Credentials", "true")
      .send("401 Unauthorized");
    next("route");
  } else {
    next();
  }
}

const app = expressWs(express()).app;

// Body
app.use(express.text());
app.use(express.json());
app.use(express.urlencoded({extended: false}));

// Authentication
app.use(async (req, res, next) => {
  const sessionId = getCookie(req.get("Cookie"), "DiaformSession");
  const userId = sessionId === null ? null : await DB.Session.authenticate(sessionId);
  req.user = userId ?? undefined;
  req.session = sessionId ?? undefined;
  req.hasSession = userId !== null;
  next();
});

// Logging
app.use((req, res, next) => {
  function formatIp() {
    if (req.header("x-forwarded-for")) {
      return req.header("x-forwarded-for");
    } else {
      return req.ip;
    }
  }

  if (Object.keys(req.body).length > 0) {
    console.log(
      "(%s) %s %s %s",
      formatIp(),
      req.method,
      req.url,
      util.inspect(req.body, {colors: true, breakLength: Infinity, compact: true, depth: undefined}),
    );
  } else {
    console.log("(%s) %s %s", formatIp(), req.method, req.url);
  }
  next();
});

function sendRedirect(res: express.Response, location: string): void {
  res.status(303).header("Location", location).end();
}

app.get("/logout", async (req, res) => {
  sendRedirect(res.header("Set-Cookie", "DiaformSession=; Max-Age=0"), `${staticUrl}/`);
});

app.ws("/changes", async (ws, req) => {
  if (req.user === undefined) return ws.close();

  let subscription: number | null = null;

  // The first message from the client is an ID for that client. We don't want
  // to notify a particular client of its own changes. That would be silly!

  ws.onmessage = (ev) => {
    if (typeof ev.data !== "string") {
      console.warn("Received unexpected data over websocket: %o", ev);
      return;
    }

    subscription = changes.subscribe(req.user!, ev.data, (change: string) => {
      ws.send(JSON.stringify([change]));
    });

    ws.onmessage = () => {};
  };

  ws.onclose = (ev) => {
    if (subscription !== null) {
      changes.unsubscribe(subscription);
    }
  };
});

app.get("/state", requireSession, async (req, res) => {
  const message: Communication.FullStateResponse = await DB.getFullState(req.user!);
  res
    .type("json")
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send(message);
});

app.get("/username", requireSession, async (req, res) => {
  res
    .type("json")
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send(JSON.stringify(await DB.userName(req.user!)));
});

async function parseThingExists(req: express.Request, res: express.Response, next: express.NextFunction) {
  const thing = req.params.thing;
  if (thing.length === 0) {
    res.status(400).type("text/plain").send("400 Bad Request");
    next("router");
  }
  if ((await DB.getThingData(req.user!, thing)) === null) {
    res
      .type("text/plain")
      .status(404)
      .header("Access-Control-Allow-Origin", staticUrl)
      .header("Access-Control-Allow-Credentials", "true")
      .send("404 Not Found");
    return next("router");
  }
  res.locals.thing = thing;
  next();
}

// #region Updates

async function requireClientId(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers["thinktool-client-id"];

  if (typeof header !== "string") {
    console.log(header, req.headers);
    res.status(400).type("text/plain").send("400 Bad Request: Missing client ID header");
    return next("router");
  }

  res.locals.clientId = header;

  next();
}

app.options("/state/things/:thing", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
    .header("Access-Control-Allow-Headers", "Thinktool-Client-Id, Content-Type")
    .send();
});

app.options("/api/things/:thing/content", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
    .header("Access-Control-Allow-Headers", "Thinktool-Client-Id, Content-Type")
    .send();
});

app.options("/state/things", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "POST, OPTIONS")
    .header("Access-Control-Allow-Headers", "Thinktool-Client-Id, Content-Type")
    .send();
});

app.post("/state/things", requireSession, requireClientId, async (req, res) => {
  const $updateContent = $array({
    name: "string",
    content: $content,
    children: $array({name: "string", child: "string"}),
  });

  const data: unknown = req.body;
  if (!isValid($updateContent, data)) return res.sendStatus(400);

  for (const thing of data) {
    await DB.updateThing({
      userId: req.user!,
      thing: thing.name,
      content: thing.content,
      children: thing.children,
      isPage: false, // [TODO] Unused. We can just remove this.
    });
  }

  for (const thing of data) {
    changes.updated(req.user!, thing.name, res.locals.clientId);
  }

  res.header("Access-Control-Allow-Origin", staticUrl).header("Access-Control-Allow-Credentials", "true").end();
});

app.options("/state/things/:thing", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
    .header("Access-Control-Allow-Headers", "Thinktool-Client-Id, Content-Type")
    .send();
});

app.delete("/state/things/:thing", requireSession, parseThingExists, requireClientId, async (req, res) => {
  await DB.deleteThing(req.user!, res.locals.thing);
  changes.updated(req.user!, res.locals.thing, res.locals.clientId);
  res.header("Access-Control-Allow-Origin", staticUrl).header("Access-Control-Allow-Credentials", "true").end();
});

app.put("/api/things/:thing/content", requireSession, parseThingExists, requireClientId, async (req, res) => {
  const content: unknown = req.body;
  if (!isValid($content, content)) return res.sendStatus(400);

  await DB.setContent(req.user!, res.locals.thing, content);
  changes.updated(req.user!, res.locals.thing, res.locals.clientId);

  res.header("Access-Control-Allow-Origin", staticUrl).header("Access-Control-Allow-Credentials", "true").end();
});

// #endregion

app.get("/state/things/:thing", requireSession, parseThingExists, async (req, res) => {
  const thingData = await DB.getThingData(req.user!, res.locals.thing);

  res.header("Access-Control-Allow-Origin", staticUrl).header("Access-Control-Allow-Credentials", "true");
  if (thingData === null) {
    res.status(404).send();
  } else {
    const message: Communication.ThingData = thingData;
    res.type("json").send(message);
  }
});

app.post("/login", async (req, res) => {
  const body: unknown = req.body;
  if (!isValid({user: "string", password: "string"}, body)) return res.sendStatus(400);

  const userId = await DB.userId(body.user.toLowerCase(), body.password);

  if (userId === null) {
    console.warn("User %o tried to log in with incorrect password", body.user);
    return res.status(401).type("text/plain").send("Invalid username and password combination. Please try again.");
  }

  const sessionId = await DB.Session.create(userId);
  sendRedirect(res.header("Set-Cookie", `DiaformSession=${sessionId}`), `${staticUrl}/app.html`);
});

app.post("/signup", async (req, res) => {
  const body: unknown = req.body;
  if (
    !isValid({user: "string", password: "string", email: "string"}, body) ||
    body.user.length > 32 ||
    body.user.length === 0
  )
    return res.sendStatus(400);

  const result = await DB.createUser(body.user, body.password, body.email);
  if (result.type === "error")
    return res
      .status(409)
      .type("text/plain")
      .send(`Unable to create user: The user "${body.user}" already exists. (Or a different error occurred.)`);
  const {userId} = result;

  if (req.body.newsletter !== undefined) {
    await DB.subscribeToNewsletter(body.email);
  }

  const sessionId = await DB.Session.create(userId);
  sendRedirect(res.header("Set-Cookie", `DiaformSession=${sessionId}`), `${staticUrl}/app.html`);
});

app.options("/api/account/everything/:account", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "DELETE, OPTIONS")
    .send();
});

app.delete("/api/account/everything/:account", requireSession, async (req, res) => {
  if (req.params.account !== req.user!.name) {
    console.warn(`${req.user!.name} tried to delete ${req.params.account}'s account`);
    res
      .status(401)
      .type("text/plain")
      .header("Access-Control-Allow-Origin", staticUrl)
      .header("Access-Control-Allow-Credentials", "true")
      .send("You don't own that account.");
    return;
  }

  res
    .status(200)
    .header("Set-Cookie", "DiaformSession=; Max-Age=0") // [TODO] For some reason, this doesn't seem to do anything
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send();

  DB.Session.invalidateUser(req.user!);

  await DB.deleteAllUserData(req.user!);
});

app.options("/api/account/email", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
    .send();
});

app.get("/api/account/email", requireSession, async (req, res) => {
  res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send((await DB.getEmail(req.user!)) ?? "");
});

app.put("/api/account/email", requireSession, async (req, res) => {
  if (typeof req.body !== "string") {
    res.status(400).send();
  }

  if (req.body !== "") {
    await DB.setEmail(req.user!, req.body);
  }

  res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send();
});

app.options("/api/account/password", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "PUT, OPTIONS")
    .send();
});

app.put("/api/account/password", requireSession, async (req, res) => {
  if (typeof req.body !== "string") {
    res.status(400).send();
  }

  if (req.body !== "") {
    await DB.setPassword(req.user!, req.body);
  }

  res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send();
});

app.options("/api/account/tutorial-finished", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
    .send();
});

app.put("/api/account/tutorial-finished", requireSession, async (req, res) => {
  await DB.setTutorialFinished(req.user!, true);

  res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send();
});

app.get("/api/account/tutorial-finished", requireSession, async (req, res) => {
  res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send(await DB.getTutorialFinished(req.user!));
});

app.post("/forgot-password", async (req, res) => {
  const user = Routing.body(req, res, "user", Routing.isString(), {optional: true});
  const email = Routing.body(req, res, "email", Routing.isString(), {optional: true});

  if (user === null && email === null) return;

  const startResult = await PasswordRecovery.start(
    user === null ? {email: email!} : {username: user},
    PasswordRecovery.databaseUsers,
  );

  if (startResult.recoveryKey !== null)
    await DB.registerResetKey({user: startResult.recoveryKey.user, key: startResult.recoveryKey.key});
  if (startResult.email !== null) await Mail.send(startResult.email);

  res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send(
      "If a user with that username and email exists, we have sent them an email with instructions on how to recover their account. Remember to check your spam folder!",
    );
});

app.post("/recover-account", async (req, res) => {
  const user = Routing.body(req, res, "user", Routing.isString());
  const key = Routing.body(req, res, "key", Routing.isString());
  const password = Routing.body<string>(req, res, "password", Routing.isString({maxLength: 256}));

  if (user === null || key === null || password === null) return;

  const result = await PasswordRecovery.recover(
    {user: {name: user}, key, password},
    PasswordRecovery.databaseKeys,
  );

  if (result.setPassword !== null) {
    await DB.setPassword(result.setPassword.user, result.setPassword.password);
    return res
      .status(200)
      .header("Access-Control-Allow-Origin", staticUrl)
      .header("Access-Control-Allow-Credentials", "true")
      .send(`Successfully reset your password. Try logging in with the new password.`);
  } else {
    return res
      .status(401)
      .header("Access-Control-Allow-Origin", staticUrl)
      .header("Access-Control-Allow-Credentials", "true")
      .send(
        `Your Reset Key is invalid. If you need support, see ${staticUrl}/index.html for contact information.`,
      );
  }
});

app.options("/newsletter/subscribe", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "POST, OPTIONS")
    .send();
});

app.post("/newsletter/subscribe", async (req, res) => {
  console.log(req.body);
  if (typeof req.body !== "object" || typeof req.body.email !== "string") {
    return res.status(400).type("text/plain").send("400 Bad Request");
  }

  await DB.subscribeToNewsletter(req.body.email);

  return res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send(`${req.body.email} is now subscribed to the newsletter.`);
});

app.get("/unsubscribe", async (req, res) => {
  return res
    .status(200)
    .send(
      `To confirm that you want to unsubscribe from the newsletter, please click this button: <form action="/unsubscribe?key=${req.query.key}" method="post"><input type="submit" value="Unsubscribe from newsletter"/></form>`,
    );
});

app.post("/unsubscribe", async (req, res) => {
  const key = req.query.key;
  if (typeof key !== "string") {
    console.warn("User tried to unsubscribe from newsletter but did not provide key", key);
    return res
      .status(400)
      .send(
        `An error occurred while trying to unsubscribe you from the newsletter. Did you use the correct link?<p>If you can't unsubscribe, please send an email to jonas@thinktool.io, and I'll do it for you manually :)`,
      );
  }

  const result = await DB.unsubscribe(key);

  if (result === "invalid-key") {
    console.warn("User tried to unsubscribe with invalid key", key);
    return res
      .status(400)
      .send(
        `The key <code>${key}</code> was not recognized. Did you use the correct link?<p>If you can't unsubscribe, please send an email to jonas@thinktool.io, and I'll do it for you manually :)`,
      );
  } else {
    const email = result[1];
    return res.status(200).send(`Succesfully unsubscribed ${email} from the newsletter.`);
  }
});

// Error handling
app.use((req, res, next) => {
  if (!res.headersSent) res.type("text/plain").status(404).send("404 Not Found");
});

// Start app

(async () => {
  const listenPort = +(process.env.DIAFORM_PORT ?? 80);
  await DB.initialize(
    process.env.DIAFORM_POSTGRES_HOST ?? "localhost",
    process.env.DIAFORM_POSTGRES_USERNAME ?? "postgres",
    process.env.DIAFORM_POSTGRES_PASSWORD ?? "postgres",
    +(process.env.DIAFORM_POSTGRES_PORT ?? "5432"),
  );
  app.listen(listenPort, () => {
    console.log(`Listening on http://localhost:${listenPort}/`);
  });
})();
