import * as D from "./data";

export function contentToEditString(content: D.Content): string {
  let result = "";
  for (const segment of content) {
    if (typeof segment === "string") result += segment;
    else result += `#${segment.link}`;
  }
  return result;
}

export function contentFromEditString(editString: string): D.Content {
  try {
    let result: D.Content = [];
    let buffer = "";
    let readingLink = false;

    function commit() {
      if (buffer !== "") {
        if (readingLink) {
          result.push({link: buffer});
        } else {
          result.push(buffer);
        }
      } else if (buffer === "" && readingLink) {
        result.push("#");
      }
      buffer = "";
    }

    for (const ch of [...editString]) {
      if (ch === "#") {
        commit();
        readingLink = true;
      } else if (readingLink) {
        if (ch.match(/[a-z0-9]/)) {
          buffer += ch;
        } else {
          commit();
          readingLink = false;
          buffer = ch;
        }
      } else {
        buffer += ch;
      }
    }

    commit();

    return result;
  } catch (e) {
    console.error("Parse error while trying to convert string %o to content: %o", editString, e);
    return [];
  }
}
