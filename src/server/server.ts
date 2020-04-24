import * as crypto from "crypto";
import express from "express";
import expressWs from "express-ws";
import * as util from "util";

import * as DB from "./database";
import * as Mail from "./mail";
import * as Communication from "../shared/communication";

const staticUrl = process.env.DIAFORM_STATIC_HOST;

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

  function subscribe(
    userId: DB.UserId,
    receiver: ClientId,
    callback: (thing: string) => void,
  ): SubscriptionId {
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
      util.inspect(req.body, {colors: true, breakLength: Infinity, compact: true}),
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

app.get("/ping/*", async (req, res) => {
  // Extremely basic analytics just so we can see if we get *any* traffic in the log.
  res.send();
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
  res
    .type("json")
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send((await DB.getFullState(req.user!)) as Communication.FullStateResponse);
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

async function parseThing(req: express.Request, res: express.Response, next: express.NextFunction) {
  const thing = req.params.thing;
  if (thing.length === 0) {
    res.status(400).type("text/plain").send("400 Bad Request");
    next("router");
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
  if (typeof req.body !== "object") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }
  const data = req.body as Communication.UpdateThings;

  for (const thing of data) {
    await DB.updateThing({
      userId: req.user!,
      thing: thing.name,
      content: thing.content,
      children: thing.children,
    });
  }

  for (const thing of data) {
    changes.updated(req.user!, thing.name, res.locals.clientId);
  }

  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .end();
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
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .end();
});

app.put("/api/things/:thing/content", requireSession, parseThingExists, requireClientId, async (req, res) => {
  if (typeof req.body !== "string") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }

  await DB.setContent(req.user!, res.locals.thing, req.body);
  changes.updated(req.user!, res.locals.thing, res.locals.clientId);

  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .end();
});

// #endregion

app.get("/state/things/:thing", requireSession, parseThingExists, async (req, res) => {
  const thingData = await DB.getThingData(req.user!, res.locals.thing);

  res.header("Access-Control-Allow-Origin", staticUrl).header("Access-Control-Allow-Credentials", "true");
  if (thingData === null) {
    res.status(404).send();
  } else {
    res.type("json").send(thingData as Communication.ThingData);
  }
});

app.post("/login", async (req, res) => {
  if (
    !(
      typeof req.body === "object" &&
      typeof req.body.user === "string" &&
      typeof req.body.password === "string"
    )
  ) {
    return res.status(400).type("text/plain").send("400 Bad Request");
  }

  const {user, password} = req.body;

  console.log("[server] Login: Asking DB to validate user %o, %o", user, password);

  const userId = await DB.userId(user.toLowerCase(), password);
  console.log("[server] Got user ID %o", userId);
  if (userId === null)
    return res
      .status(401)
      .type("text/plain")
      .send("Invalid username and password combination. Please try again.");

  console.log("[server] Creating session ID");
  const sessionId = await DB.Session.create(userId);
  console.log("[server] Everything OK, sending response");
  sendRedirect(res.header("Set-Cookie", `DiaformSession=${sessionId}`), `${staticUrl}/app.html`);
});

app.post("/signup", async (req, res) => {
  if (
    !(
      typeof req.body === "object" &&
      typeof req.body.user === "string" &&
      req.body.user.length > 0 &&
      req.body.user.length <= 32 &&
      /^[a-z][a-z0-9]*$/.test(req.body.user) &&
      typeof req.body.password === "string" &&
      req.body.password.length > 0 &&
      req.body.password.length <= 256 &&
      typeof req.body.email === "string" &&
      req.body.email.length > 0 &&
      req.body.email.length < 1024
    )
  ) {
    return res.status(400).type("text/plain").send("400 Bad Request");
  }

  const {user, password, email} = req.body;

  const result = await DB.createUser(user, password, email);
  if (result.type === "error")
    return res
      .status(409)
      .type("text/plain")
      .send(`Unable to create user: The user "${user}" already exists. (Or a different error occurred.)`);

  const {userId} = result;
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
    await DB.setPassword(req.user!.name, req.body);
  }

  res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send();
});

app.post("/forgot-password", async (req, res) => {
  if (
    !(typeof req.body === "object" && typeof req.body.user === "string" && typeof req.body.email === "string")
  ) {
    return res.status(400).type("text/plain").send("400 Bad Request");
  }

  if (await DB.knownUserEmailPair({user: req.body.user, email: req.body.email})) {
    const key = await new Promise<string>((resolve, reject) => {
      crypto.randomBytes(32, (err, buffer) => {
        if (err) reject(err);
        resolve(buffer.toString("base64"));
      });
    });
    await DB.registerResetKey({user: req.body.user, key});

    // [TODO] Send email
    await Mail.send({
      to: req.body.email,
      subject: "Reset your password",
      message: `You requested to be sent this email because you forgot your password.\nTo recover your account, go to this URL: ${staticUrl}/recover-account.html\n\Use this secret Reset Key: ${key}\n\nThe key will expire in 2 hours.`,
    });
  } else {
    console.warn(
      "Someone tried to recover account with invalid user/email pair: %o, %o",
      req.body.user,
      req.body.email,
    );
  }

  res
    .status(200)
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send(
      "If a user with that username and email exists, we have sent them an email with instructions on how to recover their account. Remember to check your spam folder!",
    );
});

app.post("/recover-account", async (req, res) => {
  if (
    !(
      typeof req.body === "object" &&
      typeof req.body.user === "string" &&
      typeof req.body.key === "string" &&
      typeof req.body.password === "string" &&
      req.body.password.length > 0 &&
      req.body.password.length <= 256
    )
  ) {
    return res.status(400).type("text/plain").send("400 Bad Request");
  }

  if (await DB.isValidResetKey(req.body.user, req.body.key)) {
    await DB.setPassword(req.body.user, req.body.password);
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
