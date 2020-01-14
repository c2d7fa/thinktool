import * as http from "http";
import * as fs from "fs";
import * as crypto from "crypto";

import {Things, empty as emptyThings} from "./data";

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
      console.warn("Got error while parsing JSON for user ${userId} (%o): %o", content, e);
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

  return {get, put};
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

const respondFile = (path: string, contentType: string, response: http.ServerResponse) => {
  fs.readFile(path, (err, content) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    response.writeHead(200, {"Content-Type": contentType, "Content-Length": content.byteLength});
    response.end(content, "utf-8");
  });
};

function getCookie(cookies: string | undefined, key: string): string | null {
  // TODO: This seems like a really horrible way of doing this.
  if (cookies === undefined)
    return null;
  const result = cookies.match(new RegExp(`(?:^|;\\s+)${key}=(\\S*)(?:$|;\\s+)`));
  if (result && typeof result[1] === "string")
    return result[1];
  return null;
}

function parseLogInOrSignUpRequest(body: string): {type: "login" | "signup"; user: string; password: string} | null {
  const result = body.match(new RegExp(`^user=([^&]*)&password=([^&]*)&(login|signup)=[^&]*$`));
  if (result && typeof result[1] === "string" && typeof result[2] === "string" && typeof result[3] === "string") {
    let type;
    if (result[3] === "login") type = "login";
    else if (result[3] === "signup") type = "signup";
    else return null;
    return {type, user: result[1], password: result[2]};
  }
  return null;
}

fs.mkdirSync("../../data", {recursive: true});

http.createServer(async (request: http.IncomingMessage, response: http.ServerResponse) => {
  console.log("%s %s %s", request.socket.remoteAddress, request.method, request.url);

  let sessionId = getCookie(request.headers.cookie, "DiaformSession");

  if (request.url == "" || request.url == "/") {
    if (request.method === "POST") {
      // User is logging in
      // TODO: We should do something about too large requests
      let body = "";
      request.on("data", (chunk) => { body += chunk });
      request.on("end", async () => {
        const loginOrSignupRequest = parseLogInOrSignUpRequest(body);

        if (loginOrSignupRequest === null) {
          response.writeHead(400, {"Content-Type": "text/plain"});
          response.end("400 Bad Request");
        } else if (loginOrSignupRequest.type === "login") {
          const {user, password} = loginOrSignupRequest;
          const userId = await authentication.userId(user, password);
          if (userId !== null) {
            sessionId = await session.create(userId);
            response.writeHead(303, {"Set-Cookie": `DiaformSession=${sessionId}`, "Location": "/"});
            response.end();
          } else {
            response.writeHead(401, {"Content-Type": "text/plain"});
            response.end("Invalid username and password combination. Please try again.");
          }
        } else if (loginOrSignupRequest.type === "signup") {
          const {user, password} = loginOrSignupRequest;
          const result = await authentication.createUser(user, password);
          if (result.type === "error") {
            response.writeHead(409, {"Content-Type": "text/plain"});
            response.end(`Unable to create user: The user "${user}" already exists.`);
          } else {
            const {userId} = result;
            const sessionId = await session.create(userId);
            response.writeHead(303, {"Set-Cookie": `DiaformSession=${sessionId}`, "Location": "/"});
            response.end();
          }

        }
      });
    } else {
      if (session.validId(sessionId)) {
        respondFile("../static/index.html", "text/html", response);
      } else {
        respondFile("../static/login.html", "text/html", response);
      }
    }
  } else if (request.url == "/bundle.js") {
    respondFile("./bundle.js", "text/javascript", response);
  } else if (request.url == "/style.css") {
    respondFile("../static/style.css", "text/css", response);
  } else if (request.url == "/bullet-collapsed.svg") {
    respondFile("../static/bullet-collapsed.svg", "image/svg+xml", response);
  } else if (request.url == "/bullet-expanded.svg") {
    respondFile("../static/bullet-expanded.svg", "image/svg+xml", response);
  } else if (request.url == "/bullet-collapsed-page.svg") {
    respondFile("../static/bullet-collapsed-page.svg", "image/svg+xml", response);
  } else if (request.url == "/bullet-expanded-page.svg") {
    respondFile("../static/bullet-expanded-page.svg", "image/svg+xml", response);
  } else if (request.url == "/data.json") {
    if (!session.validId(sessionId)) {
      response.writeHead(401, {"Content-Type": "text/plain"});
      response.end("401 Unauthorized");
      return;
    }
    if (sessionId === null) throw "logic error"; // sessionId is valid

    const userId = session.user(sessionId);
    if (userId === null) throw "logic error"; // sessionId is valid

    if (request.method === "PUT") {
      // Read body
      // TODO: We should do something about very large requests
      let body = "";
      request.setEncoding("utf-8");
      request.on("data", (chunk) => { body += chunk });

      request.on("end", () => {
        console.log("%s %s %s %s", request.socket.remoteAddress, request.method, request.url, JSON.stringify(body));
        try {
          const json = JSON.parse(body);
          data.put(userId, json);  // TODO: Check that it is actually valid data
        } catch (e) {
          console.warn("Invalid JSON: %o", body);
        }
        response.statusCode = 200;
        response.end();
      });
    } else {
      const value = await data.get(userId);
      response.writeHead(200, {"Content-Type": "application/json"});
      response.end(JSON.stringify(value));
    }
  } else if (request.url === "/api/username") {
    if (!session.validId(sessionId)) {
      response.writeHead(401, {"Content-Type": "text/plain"});
      response.end("401 Unauthorized");
    } else {
      response.writeHead(200, {"Content-Type": "application/json"});
      if (sessionId === null) throw "logic error";
      const userId = session.user(sessionId);
      if (userId === null) throw "logic error";
      response.end(JSON.stringify(await authentication.userName(userId)));
    }
  } else if (request.url === "/logout") {
    response.writeHead(303, {"Set-Cookie": `DiaformSession=; Max-Age=0`, "Location": "/"});
    response.end();
  } else {
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.end("404 Not found", "utf-8");
  }
}).listen(80);

console.log("Listening on http://localhost:80/");
