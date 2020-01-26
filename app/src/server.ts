import * as crypto from "crypto";
import * as express from "express";
import * as util from "util";

import * as Data from "./data";
import * as DB from "./server/database";

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

  function hasChanges(sessionId: string): boolean {
    const session = sessions[sessionId];
    const lastUpdated = DB.lastUpdated(user(sessionId)!);
    if (session.lastPolled === null)
      return lastUpdated !== null;
    if (lastUpdated === null)
      return false;
    return lastUpdated > session.lastPolled;
  }

  function sessionPolled(sessionId: string): void {
    sessions[sessionId].lastPolled = new Date();
  }

  return {create, user, validId, hasChanges, sessionPolled};
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
    res.status(401).type("text/plain").send("401 Unauthorized");
    next("route");
  } else {
    next();
  }
}

const requireUpToDateSession = [requireSession, ((req: express.Request, res: express.Response, next: express.NextFunction): void => {
  return requireSession(req, res, () => {
    if (session.hasChanges(req.session!)) {
      console.log("Denying request because client is unaware of some changes.");
      res.status(409).type("text/plain").send("I refuse to process your request because there are new changes to the state since you last polled.");
      next("route");
    } else {
      next();
    }
  });
})];

const app = express();

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
  return res.sendFile(path, {root: "../static"});
}

app.get("/", (req, res) => {
  if (req.hasSession) {
    session.sessionPolled(req.session!);
    sendStatic(res, "index.html");
  } else {
    sendStatic(res, "login.html");
  }
});

app.get("/api/changes", requireSession, async (req, res) => {
  res.type("json").send(session.hasChanges(req.session!));
});

app.post("/api/changes", requireSession, async (req, res) => {
  session.sessionPolled(req.session!);
  res.end();
});

app.get("/api/things", requireSession, async (req, res) => {
  res.type("json").send(await DB.getThings(req.user!));
});

app.get("/api/username", requireSession, async (req, res) => {
  res.type("json").send(JSON.stringify(await DB.userName(req.user!)));
});

async function parseThingExists(req: express.Request, res: express.Response, next: express.NextFunction) {
  const thing = req.params.thing;
  if (thing.length === 0) {
    res.status(400).type("text/plain").send("400 Bad Request");
    next("router");
  }
  if (!Data.exists(await DB.getThings(req.user!), thing)) {
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
  next();}

app.get("/api/things/:thing", requireSession, parseThingExists, async (req, res) => {
  res.type("application/json").send(JSON.stringify((await DB.getThings(req.user!)).things[res.locals.thing]));
});

app.put("/api/things/:thing", requireUpToDateSession, parseThing, async (req, res) => {
  if (typeof req.body !== "object") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }
  await DB.putThing(req.user!, res.locals.thing, req.body);
  session.sessionPolled(req.session!);
  res.end();
});

app.delete("/api/things/:thing", requireUpToDateSession, parseThingExists, async (req, res) => {
  await DB.deleteThing(req.user!, res.locals.thing);
  session.sessionPolled(req.session!);
  res.end();
});

app.get("/api/things/:thing/content", requireSession, parseThingExists, async (req, res) => {
  res.type("text/plain").send(Data.content(await DB.getThings(req.user!), res.locals.thing));
});

app.put("/api/things/:thing/content", requireUpToDateSession, parseThingExists, async (req, res) => {
  if (typeof req.body !== "string") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }

  await DB.setContent(req.user!, res.locals.thing, req.body);
  session.sessionPolled(req.session!);
  res.end();
});

app.get("/api/things/:thing/page", requireSession, parseThingExists, async (req, res) => {
  const page = Data.page(await DB.getThings(req.user!), res.locals.thing);
  if (page === null) {
    res.status(404).end();
    return;
  }
  res.type("text/plain").send(page);
});

app.put("/api/things/:thing/page", requireUpToDateSession, parseThingExists, async (req, res) => {
  if (typeof req.body !== "string") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }

  await DB.setPage(req.user!, res.locals.thing, req.body);
  session.sessionPolled(req.session!);
  res.end();
});

app.delete("/api/things/:thing/page", requireUpToDateSession, parseThingExists, async (req, res) => {
  await DB.setPage(req.user!, res.locals.thing, null);
  session.sessionPolled(req.session!);
  res.end();
});

app.get("/logout", async (req, res) => {
  res
    .status(303)
    .header("Set-Cookie", "DiaformSession=; Max-Age=0")
    .header("Location", "/")
    .end();
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
    res.status(303).header("Set-Cookie", `DiaformSession=${sessionId}`).header("Location", "/").end();
  } else if (req.body.signup) {
    const {user, password} = req.body;
    const result = await DB.createUser(user, password);
    if (result.type === "error") {
      res.status(409).type("text/plain").send(`Unable to create user: The user "${user}" already exists.`);
    } else {
      const {userId} = result;
      const sessionId = await session.create(userId);
      res.status(303).header("Set-Cookie", `DiaformSession=${sessionId}`).header("Location", "/").end();
    }
  } else {
    res.status(400).type("text/plain").send("400 Bad Request");
  }
});

// Static files
app.get("/bundle.js", (req, res) => { res.sendFile("bundle.js", {root: "."}) });
app.get("/style.css", (req, res) => { sendStatic(res, "style.css") });
app.get("/bullet-collapsed.svg", (req, res) => { sendStatic(res, "bullet-collapsed.svg") });
app.get("/bullet-expanded.svg", (req, res) => { sendStatic(res, "bullet-expanded.svg") });
app.get("/bullet-collapsed-page.svg", (req, res) => { sendStatic(res, "bullet-collapsed-page.svg") });
app.get("/bullet-expanded-page.svg", (req, res) => { sendStatic(res, "bullet-expanded-page.svg") });

// Error handling
app.use((req, res, next) => {
  if (!res.headersSent)
    res.type("text/plain").status(404).send("404 Not Found");
});

// Start app

(async () => {
  await DB.initialize("mongodb://admin:KOZ5vGsz5ZQJBY7rZvkaEsmx@localhost:27017");
  app.listen(80, () => { console.log("Listening on http://localhost:80/") });
})();
