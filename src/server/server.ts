import * as crypto from "crypto";
import express from "express";
import expressWs from "express-ws";
import * as util from "util";

import * as DB from "./database";
import * as Communication from "../shared/communication";

const staticUrl = "http://localhost:8085" // [TODO] Make this configurable

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
    for (const subscription of Object.values(subscriptions).filter(s => s.userId.name === userId.name && s.receiver !== sender)) {
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

const session = (() => {
  interface SessionData {
    userId: DB.UserId;
    lastPolled: Date | null;
  }

  const sessions: {[id: string]: SessionData} = {};

  async function create(userId: DB.UserId): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(24, (err, buffer) => {
        if (err) reject(err);
        const id = buffer.toString("base64");
        sessions[id] = {userId, lastPolled: null};
        resolve(id);
      });
    });
  }

  function user(sessionId: string): DB.UserId | null {
    if (sessions[sessionId] === undefined)
      return null;
    return sessions[sessionId].userId;
  }

  function validId(sessionId: string | null): boolean {
    if (typeof sessionId !== "string")
      return false;
    return user(sessionId) !== null;
  }

  return {create, user, validId};
})();

function getCookie(cookies: string | undefined, key: string): string | null {
  // TODO: This seems like a really horrible way of doing this.
  if (cookies === undefined)
    return null;
  const result = cookies.match(new RegExp(`(?:^|;\\s+)${key}=(\\S*)(?:$|;\\s+)`));
  if (result && typeof result[1] === "string")
    return result[1];
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
    res.status(401).type("text/plain")
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
app.use((req, res, next) => {
  const sessionId = getCookie(req.get("Cookie"), "DiaformSession");
  const userId = sessionId === null ? null : session.user(sessionId);
  req.user = userId ?? undefined;
  req.session = sessionId ?? undefined;
  req.hasSession = userId !== null;
  next();
});

// Logging
app.use((req, res, next) => {
  if (Object.keys(req.body).length > 0) {
    console.log("%s %s %s %s", req.ip, req.method, req.url, util.inspect(req.body, {colors: true, breakLength: Infinity, compact: true}));
  } else {
    console.log("%s %s %s", req.ip, req.method, req.url);
  }
  next();
});

function sendStatic(res: express.Response, path: string) {
  return res.sendFile(path, {root: "../../dist/static"});
}

function sendRedirect(res: express.Response, location: string): void {
  res.status(303).header("Location", location).end();
}

app.get("/", (req, res) => {
  if (req.hasSession) {
    return sendStatic(res, "app.html");
  } else {
    return sendStatic(res, "landing.html");
  }
});

app.get("/demo", (req, res) => {
  return sendStatic(res, "demo.html");
});

app.get("/login", (req, res) => {
  if (req.hasSession) return sendRedirect(res, "/");
  sendStatic(res, "login.html");
});

app.get("/logout", async (req, res) => {
  sendRedirect(res.header("Set-Cookie", "DiaformSession=; Max-Age=0"), `${staticUrl}/landing.html`);
});

app.ws("/api/changes", async (ws, req) => {
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

app.get("/api/things", requireSession, async (req, res) => {
  const result = (await DB.getAllThings(req.user!)).map(t => ({name: t.name, content: t.content ?? "", children: t.children ?? []}));
  res.type("json")
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send(result as Communication.FullStateResponse);
});

app.get("/api/username", requireSession, async (req, res) => {
  res.type("json")
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
  if (!DB.thingExists(req.user!, thing)) {
    res.type("text/plain").status(404).send("404 Not Found");
    return;
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

app.options("/api/things/:thing", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
    .header("Access-Control-Allow-Headers", "Thinktool-Client-Id, Content-Type")
    .send()
})

app.options("/api/things/:thing/content", async (req, res) => {
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
    .header("Access-Control-Allow-Headers", "Thinktool-Client-Id, Content-Type")
    .send()
})

app.put("/api/things/:thing", requireSession, parseThing, requireClientId, async (req, res) => {
  if (typeof req.body !== "object") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }
  const data = req.body as Communication.ThingData;
  await DB.updateThing(req.user!, res.locals.thing, data.content, data.children);
  changes.updated(req.user!, res.locals.thing, res.locals.clientId);
  res
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .end();
});

app.delete("/api/things/:thing", requireSession, parseThingExists, requireClientId, async (req, res) => {
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

app.get("/api/things/:thing", requireSession, parseThingExists, async (req, res) => {
  const thingData = await DB.getThingData(req.user!, res.locals.thing);
  res.type("json")
    .header("Access-Control-Allow-Origin", staticUrl)
    .header("Access-Control-Allow-Credentials", "true")
    .send(thingData as Communication.ThingData);
});

app.post("/", async (req, res) => {
  if (typeof req.body !== "object" || typeof req.body.user !== "string" || typeof req.body.password !== "string") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }

  if (req.body.login) {
    const {user, password} = req.body;
    const userId = await DB.userId(user, password);
    if (userId === null) {
      res.status(401).type("text/plain").send("Invalid username and password combination. Please try again.");
      return;
    }
    const sessionId = await session.create(userId);
    sendRedirect(res.header("Set-Cookie", `DiaformSession=${sessionId}`), `${staticUrl}/app.html`);
  } else if (req.body.signup) {
    const {user, password} = req.body;
    const result = await DB.createUser(user, password);
    if (result.type === "error") {
      res.status(409).type("text/plain").send(`Unable to create user: The user "${user}" already exists.`);
    } else {
      const {userId} = result;
      const sessionId = await session.create(userId);
      sendRedirect(res.header("Set-Cookie", `DiaformSession=${sessionId}`), `${staticUrl}/app.html`);
    }
  } else {
    res.status(400).type("text/plain").send("400 Bad Request");
  }
});

// Static files
app.get("/bundle.js", (req, res) => { sendStatic(res, "bundle.js") });
app.get("/bundle.js.map", (req, res) => { sendStatic(res, "bundle.js.map") });
app.get("/style.css", (req, res) => { sendStatic(res, "style.css") });
app.get("/landing.css", (req, res) => { sendStatic(res, "landing.css") });
app.get("/bullet-collapsed.svg", (req, res) => { sendStatic(res, "bullet-collapsed.svg") });
app.get("/bullet-expanded.svg", (req, res) => { sendStatic(res, "bullet-expanded.svg") });
app.get("/icon.png", (req, res) => { sendStatic(res, "icon.png") });

// Error handling
app.use((req, res, next) => {
  if (!res.headersSent)
    res.type("text/plain").status(404).send("404 Not Found");
});

// Start app

(async () => {
  const databaseUri = process.env.DIAFORM_DATABASE ?? "mongodb://localhost:27017";
  const listenPort = +(process.env.DIAFORM_PORT ?? 80);
  await DB.initialize(databaseUri);
  app.listen(listenPort, () => { console.log(`Listening on http://localhost:${listenPort}/`) });
})();
