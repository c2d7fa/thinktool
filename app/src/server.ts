import * as http from "http";
import * as fs from "fs";
import * as crypto from "crypto";

import {Things} from "./data";

const data = (() => {
  async function get(userId: number): Promise<Things> {
    // TODO: Handle cases:
    // * File does not exist
    // * File does not parse as JSON
    // * JSON is not a valid Things
    return new Promise((resolve, reject) => {
      fs.readFile(`../../data/data${userId}.json`, (err, content) => {
        if (err) reject(err);
        resolve(JSON.parse(content.toString()) as Things);
      });
    });
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
  const users: {[user: string]: {password: string; id: number}} = {
    "user1": {password: "password1", id: 1},
    "user2": {password: "password2", id: 2},
  };

  // Check password and return user ID.
  function userId(user: string, password: string): number | null {
    if (!users[user])
      return null;
    if (users[user].password !== password)
      return null;
    return users[user].id;
  }

  return {userId};
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

function parseLogInRequest(body: string): {user: string; password: string} {
  const result = body.match(new RegExp(`^user=([^&]*)&password=([^&]*)$`));
  if (result && typeof result[1] === "string" && typeof result[2] === "string")
    return {user: result[1], password: result[2]};
  return null;
}

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
        const {user, password} = parseLogInRequest(body);
        const userId = authentication.userId(user, password);
        if (userId !== null) {
          sessionId = await session.create(userId);
          response.writeHead(303, {"Set-Cookie": `DiaformSession=${sessionId}`, "Location": "/"});
          response.end();
        } else {
          response.writeHead(401, {"Content-Type": "text/plain"});
          response.end("Invalid username and password combination. Please try again.");
        }
      });
    }

    if (session.validId(sessionId)) {
      respondFile("../static/index.html", "text/html", response);
    } else {
      respondFile("../static/login.html", "text/html", response);
    }
  } else if (request.url == "/bundle.js") {
    respondFile("./bundle.js", "text/javascript", response);
  } else if (request.url == "/style.css") {
    respondFile("../static/style.css", "text/css", response);
  } else if (request.url == "/bullet-collapsed.svg") {
    respondFile("../static/bullet-collapsed.svg", "image/svg+xml", response);
  } else if (request.url == "/bullet-expanded.svg") {
    respondFile("../static/bullet-expanded.svg", "image/svg+xml", response);
  } else if (request.url == "/data.json") {
    if (!session.validId(sessionId)) {
      response.writeHead(401, {"Content-Type": "text/plain"});
      response.end("401 Unauthorized");
    }
    const userId = session.user(sessionId);

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
  } else {
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.end("404 Not found", "utf-8");
  }
}).listen(80);

console.log("Listening on http://localhost:80/");
