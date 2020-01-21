import * as crypto from "crypto";
import * as express from "express";
import * as fs from "fs";
import * as lockfile from "lockfile";
import * as util from "util";

import {Things, empty as emptyThings} from "./data";
import * as Data from "./data";

const myfs = (() => {
  async function readFile(path: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, content) => {
        if (err) {
          if (err.code === "ENOENT") {
            resolve(undefined);
          } else {
            reject(err);
          }
        } else {
          resolve(content.toString());
        }
      });
    });
  }

  async function writeFile(path: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, content, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  return {readFile, writeFile};
})();

const data = (() => {
  // TODO: This lock file system is horrible implementation of a bad idea. We
  // should probably do something completely different here, but I'm not quite
  // sure what.

  const lastUpdates: {[userId: number]: Date | undefined} = {};

  async function get(userId: number): Promise<Things> {
    return await update(userId, x => x);
  }

  async function put(userId: number, data: Things): Promise<void> {
    await update(userId, x => data);
  }

  async function update(userId: number, f: (data: Things) => Things): Promise<Things> {
    // TODO: Detect case where returned JSON parses correctly but is not valid.
    return new Promise((resolve, reject) => (async () => {  // TODO: Does this even make sense? Seems to work 🤷
      lockfile.lock(`../../data/.data${userId}.json.lock`, {wait: 100}, async (err) => {
        if (err)
          return resolve(update(userId, f));  // TODO: Yikes (we do this to avoid EEXIST error)
        const content = await myfs.readFile(`../../data/data${userId}.json`);
        let things = emptyThings;
        if (content !== undefined) {
          try {
            things = JSON.parse(content);
          } catch (e) {
            console.warn(`Got error while parsing JSON for user ${userId} (%o): %o`, content, e);
          }
        }
        const newThings = f(things);
        if (newThings !== things) {
          await myfs.writeFile(`../../data/data${userId}.json`, JSON.stringify(newThings));
          lastUpdates[userId] = new Date();
        }
        lockfile.unlockSync(`../../data/.data${userId}.json.lock`);
        resolve(newThings);
      });
    })());
  }

  function lastUpdated(userId: number): Date | null {
    return lastUpdates[userId] ?? null;
  }

  return {get, put, update, lastUpdated};
})();

const session = (() => {
  interface SessionData {
    userId: number;
    lastPolled: Date | null;
  }

  const sessions: {[id: string]: SessionData} = {};

  async function create(userId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(24, (err, buffer) => {
        if (err) reject(err);
        const id = buffer.toString("base64");
        sessions[id] = {userId, lastPolled: null};
        resolve(id);
      });
    });
  }

  function user(sessionId: string): number | null {
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
    const lastUpdated = data.lastUpdated(user(sessionId)!);
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

const authentication = (() => {
  interface Users {
    nextId: number;
    users: {[name: string]: {password: string; id: number}};
  }

  async function getUsers(): Promise<Users> {
    const content = await myfs.readFile(`../../data/users.json`);
    if (content === undefined) {
      return {nextId: 0, users: {}};
    } else {
      return JSON.parse(content.toString());
    }
  }

  async function getUser(user: string): Promise<{password: string; id: number} | null> {
    const userData = await getUsers();
    if (userData.users[user] === undefined)
      return null;
    return userData.users[user];
  }

  // Check password and return user ID.
  async function userId(user: string, password: string): Promise<number | null> {
    const userData = await getUser(user);
    if (userData === null)
      return null;
    if (userData.password !== password)
      return null;
    return userData.id;
  }

  async function userName(userId: number): Promise<string | null> {
    const users = await getUsers();
    for (const name in users.users)
      if (users.users[name].id === userId)
        return name;
    return null;
  }

  // TODO: What happens if this gets called from multiple locations at the same
  // time?
  async function createUser(user: string, password: string): Promise<{type: "success"; userId: number} | {type: "error"; error: "user-exists"}> {
    const users = await getUsers();
    if (users.users[user] !== undefined)
      return {type: "error", error: "user-exists"};
    const newUsers = {...users, nextId: users.nextId + 1, users: {...users.users, [user]: {id: users.nextId, password}}};
    await myfs.writeFile("../../data/users.json", JSON.stringify(newUsers));
    return {type: "success", userId: users.nextId};
  }

  return {userId, userName, createUser};
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

fs.mkdirSync("../../data", {recursive: true});

declare module "express-serve-static-core" {
  interface Request {
    hasSession?: boolean;
    session?: string;
    user?: number;
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
  res.type("json").send(await data.get(req.user!));
});

app.put("/api/things", requireSession, async (req, res) => {
  if (typeof req.body !== "object") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }
  await data.put(req.user!, req.body);
  session.sessionPolled(req.session!);
  res.end();
});

app.get("/api/things/next", requireSession, async (req, res) => {
  res.type("text/plain").send((await data.get(req.user!)).next.toString());
});

app.put("/api/things/next", requireSession, async (req, res) => {
  if (typeof req.body !== "string" || (!+req.body && +req.body !== 0)) {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }
  await data.update(req.user!, (things) => ({...things, next: +req.body}));
  session.sessionPolled(req.session!);
  res.end();
});

app.get("/api/username", requireSession, async (req, res) => {
  res.type("json").send(JSON.stringify(await authentication.userName(req.user!)));
});

async function parseThingExists(req: express.Request, res: express.Response, next: express.NextFunction) {
  const thing = +req.params.thing;
  if (!thing && thing !== 0) {
    res.status(400).type("text/plain").send("400 Bad Request");
    next("router");
  }
  if (!Data.exists(await data.get(req.user!), thing)) {
    res.type("text/plain").status(404).send("404 Not Found");
    return;
  }
  res.locals.thing = thing;
  next();
}

async function parseThing(req: express.Request, res: express.Response, next: express.NextFunction) {
  const thing = +req.params.thing;
  if (!thing && thing !== 0) {
    res.status(400).type("text/plain").send("400 Bad Request");
    next("router");
  }
  res.locals.thing = thing;
  next();
}

app.get("/api/things/:thing", requireSession, parseThingExists, async (req, res) => {
  res.type("application/json").send(JSON.stringify((await data.get(req.user!)).things[res.locals.thing]));
});

app.put("/api/things/:thing", requireSession, parseThing, async (req, res) => {
  if (typeof req.body !== "object") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }
  await data.update(req.user!, (things) => ({...things, things: {...things.things, [res.locals.thing]: req.body}}));
  session.sessionPolled(req.session!);
  res.end();
});

app.delete("/api/things/:thing", requireSession, parseThingExists, async (req, res) => {
  await data.update(req.user!, (things) => Data.remove(things, res.locals.thing));
  session.sessionPolled(req.session!);
  res.end();
});

app.get("/api/things/:thing/content", requireSession, parseThingExists, async (req, res) => {
  res.type("text/plain").send(Data.content(await data.get(req.user!), res.locals.thing));
});

app.put("/api/things/:thing/content", requireSession, parseThingExists, async (req, res) => {
  if (typeof req.body !== "string") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }

  await data.update(req.user!, (things) => Data.setContent(things, res.locals.thing, req.body));
  session.sessionPolled(req.session!);
  res.end();
});

app.get("/api/things/:thing/page", requireSession, parseThingExists, async (req, res) => {
  const page = Data.page(await data.get(req.user!), res.locals.thing);
  if (page === null) {
    res.status(404).end();
    return;
  }
  res.type("text/plain").send(page);
});

app.put("/api/things/:thing/page", requireSession, parseThingExists, async (req, res) => {
  if (typeof req.body !== "string") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }

  await data.update(req.user!, (things) => Data.setPage(things, res.locals.thing, req.body));
  session.sessionPolled(req.session!);
  res.end();
});

app.delete("/api/things/:thing/page", requireSession, parseThingExists, async (req, res) => {
  await data.update(req.user!, (things) => Data.removePage(things, res.locals.thing));
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
    const userId = await authentication.userId(user, password);
    if (userId === null) {
      res.status(401).type("text/plain").send("Invalid username and password combination. Please try again.");
      return;
    }
    const sessionId = await session.create(userId);
    res.status(303).header("Set-Cookie", `DiaformSession=${sessionId}`).header("Location", "/").end();
  } else if (req.body.signup) {
    const {user, password} = req.body;
    const result = await authentication.createUser(user, password);
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

app.listen(80, () => { console.log("Listening on http://localhost:80/") });
