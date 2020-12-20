import * as Shared from "@thinktool/shared";
import * as D from "../data";

export type Content = Shared.Communication.Content;

export function contentText(state: D.State, thing: string): string {
  function contentText_(thing: string, seen: string[]): string {
    if (seen.includes(thing)) return "...";

    let result = "";
    for (const segment of D.content(state, thing)) {
      if (typeof segment === "string") {
        result += segment;
      } else if (typeof segment.link === "string") {
        if (D.exists(state, segment.link)) {
          result += contentText_(segment.link, [...seen, thing]);
        } else {
          result += `[${segment.link}]`;
        }
      }
    }

    return result;
  }

  return contentText_(thing, []);
}

// Items may reference other items in their content. Such items are displayed
// with the referenced item embedded where the reference is.

export function references(state: D.State, thing: string): string[] {
  let result: string[] = [];

  for (const segment of D.content(state, thing)) {
    if (typeof segment.link === "string") {
      result = [...result, segment.link];
    }
  }

  return result;
}

export function backreferences(state: D.State, thing: string): string[] {
  let result: string[] = [];
  for (const other in state.things) {
    if (references(state, other).includes(thing)) {
      result = [...result, other];
    }
  }
  return result;
}
