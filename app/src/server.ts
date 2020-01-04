import * as http from "http";
import * as fs from "fs";

const respondFile = (path, contentType, response) => {
  fs.readFile(path, (err, content) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    response.writeHead(200, {"Content-Type": contentType, "Content-Length": content.byteLength});
    response.end(content, "utf-8");
  });
};

http.createServer((request, response) => {
  console.log("%s %s %s", request.socket.remoteAddress, request.method, request.url);

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
