import * as fs from "fs";

export async function readFile(path: string): Promise<string | undefined> {
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

export async function writeFile(path: string, content: string): Promise<void> {
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
