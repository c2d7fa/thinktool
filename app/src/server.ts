import * as crypto from "crypto";
import * as express from "express";
import * as fs from "fs";

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
  async function get(userId: number): Promise<Things> {
    // TODO: Handle cases:
    // * File does not exist
    // * File does not parse as JSON
    // * JSON is not a valid Things
    const content = await myfs.readFile(`../../data/data${userId}.json`);
    if (content === undefined)
      return emptyThings;
    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn(`Got error while parsing JSON for user ${userId} (%o): %o`, content, e);
      return emptyThings;
    }
  }

  async function put(userId: number, data: Things): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(`../../data/data${userId}.json`, JSON.stringify(data), (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  async function update(userId: number, update: (data: Things) => Things): Promise<Things> {
    const newThings = update(await get(userId));
    await put(userId, newThings);
    return newThings;
  }

  return {get, put, update};
})();

const session = (() => {
  interface SessionData {
    userId: number;
  }

  const sessions: {[id: string]: SessionData} = {};

  async function create(userId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(24, (err, buffer) => {
        if (err) reject(err);
        const id = buffer.toString("base64");
        sessions[id] = {userId};
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

  return {create, user, validId};
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
  req.hasSession = userId !== null;
  next();
});

// Logging
app.use((req, res, next) => {
  console.log("%s %s %s %o", req.ip, req.method, req.url, req.body);
  next();
});

function sendStatic(res: express.Response, path: string) {
  return res.sendFile(path, {root: "../static"});
}

app.get("/", (req, res) => {
  if (req.hasSession) {
    sendStatic(res, "index.html");
  } else {
    sendStatic(res, "login.html");
  }
});

app.get("/data.json", requireSession, async (req, res) => {
  res.type("json").send(await data.get(req.user!));
});

app.put("/data.json", requireSession, async (req, res) => {
  if (typeof req.body !== "object") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }
  await data.put(req.user!, req.body);
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

app.get("/api/things/:thing/content", requireSession, parseThingExists, async (req, res) => {
  res.type("text/plain").send(Data.content(await data.get(req.user!), res.locals.thing));
});

app.put("/api/things/:thing/content", requireSession, parseThingExists, async (req, res) => {
  if (typeof req.body !== "string") {
    res.status(400).type("text/plain").send("400 Bad Request");
    return;
  }

  data.update(req.user!, (things) => Data.setContent(things, res.locals.thing, req.body));
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

  data.update(req.user!, (things) => Data.setPage(things, res.locals.thing, req.body));
  res.end();
});

app.delete("/api/things/:thing/page", requireSession, parseThingExists, (req, res) => {
  data.update(req.user!, (things) => Data.removePage(things, res.locals.thing));
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
    console.log("logging in");
    const {user, password} = req.body;
    const userId = await authentication.userId(user, password);
    if (userId === null) {
      res.status(401).type("text/plain").send("Invalid username and password combination. Please try again.");
      return;
    }
    const sessionId = await session.create(userId);
    res.status(303).header("Set-Cookie", `DiaformSession=${sessionId}`).header("Location", "/").end();
  } else if (req.body.signup) {
    console.log("signing up");
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
