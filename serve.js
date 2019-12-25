const http = require("http");
const fs = require("fs");
const path = require("path");

const respondFile = (path, contentType, response) => {
    fs.readFile(path, (err, content) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }

      response.writeHead(200, {"Content-Type": contentType});
      response.end(content, "utf-8");
    });
}

http.createServer((request, response) => {
  if (request.url == "" || request.url == "/") {
    respondFile("./app/index.html", "text/html", response);
  } else if (request.url == "/bundle.js") {
    respondFile("./app/bundle.js", "text/javascript", response);
  } else if (request.url == "/style.css") {
    respondFile("./app/style.css", "text/css", response);
  } else {
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.end("404 Not found", "utf-8");
  }
}).listen(8080);

console.log("Listening on http://localhost:8080/");

