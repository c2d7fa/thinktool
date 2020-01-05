import * as http from "http";
import * as fs from "fs";
import * as crypto from "crypto";

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
  const passwords: {[user: string]: string} = {
    "user1": "password1",
    "user2": "password2",
  };

  function check(user: string, password: string): boolean {
    if (!passwords[user]) {
      console.warn("Unknown user: %o", user);
      return false;
    }
    return passwords[user] === password;
  }

  return {check};
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
        console.log("user=%o password=%o", user, password);
        console.log(authentication.check(user, password));
        if (authentication.check(user, password)) {
          sessionId = await session.create(0);
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
          fs.writeFile("../../data/data.json", JSON.stringify(json), (err) => {});
        } catch (e) {
          console.warn("Invalid JSON: %o", body);
        }
        response.statusCode = 200;
        response.end();
      });
    } else {
      fs.readFile("../../data/data.json", (err, content) => {
        response.writeHead(200, {"Content-Type": "application/json"});
        if (err) {
          response.end("{}");
        } else {
          response.end(content);
        }
      });
    }
  } else {
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.end("404 Not found", "utf-8");
  }
}).listen(80);

console.log("Listening on http://localhost:80/");
