import * as http from "http";
import * as fs from "fs";
import * as crypto from "crypto";


const session = (() => {
  interface SessionData {
    userId: number;
  }

  let i = 0;

  const sessions: {[id: string]: SessionData} = {};

  async function create(): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(24, (err, buffer) => {
        if (err) reject(err);
        const id = buffer.toString("base64");
        sessions[id] = {userId: i++};
        resolve(id);
      });
    });
  }

  function user(sessionId: string): number | null {
    if (sessions[sessionId] === undefined)
      return null;
    return sessions[sessionId].userId;
  }

  return {create, user};
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

http.createServer(async (request: http.IncomingMessage, response: http.ServerResponse) => {
  console.log("%s %s %s", request.socket.remoteAddress, request.method, request.url);

  let sessionId = getCookie(request.headers.cookie, "DiaformSession");
  if (sessionId === null || session.user(sessionId) === null) {
    sessionId = await session.create();
    response.setHeader("Set-Cookie", `DiaformSession=${sessionId}`);
  }

  if (request.url == "" || request.url == "/") {
    respondFile("../static/index.html", "text/html", response);
  } else if (request.url == "/bundle.js") {
    respondFile("./bundle.js", "text/javascript", response);
  } else if (request.url == "/style.css") {
    respondFile("../static/style.css", "text/css", response);
  } else if (request.url == "/bullet-collapsed.svg") {
    respondFile("../static/bullet-collapsed.svg", "image/svg+xml", response);
  } else if (request.url == "/bullet-expanded.svg") {
    respondFile("../static/bullet-expanded.svg", "image/svg+xml", response);
  } else if (request.url == "/data.json") {
    console.log("User: %o", session.user(sessionId));

    if (request.method === "PUT") {
      // Read body
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
