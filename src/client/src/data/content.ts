import * as Immutable from "immutable";

import * as Shared from "@thinktool/shared";

import type {State} from "./representation";
import * as D from "./core";

export type Content = Shared.Communication.Content;

export function contentEq(a: Content, b: Content): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; ++i) {
    if (typeof a[i] === "string" && a[i] !== b[i]) return false;
    if (typeof a[i] !== "string" && (typeof b[i] === "string" || a[i].link !== b[i].link)) return false;
  }

  return true;
}

export function contentText(state: State, thing: string): string {
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

export function references(state: State, thing: string): string[] {
  return state._links.image(thing).toArray();
}

export function backreferences(state: State, thing: string): string[] {
  return state._links.preimage(thing).toArray();
}

export function linksInContent(content: Content): Immutable.Set<string> {
  function isLink(piece: Content[number]): piece is {link: string} {
    return typeof piece.link === "string";
  }

  return Immutable.Set<string>(content.filter(isLink).map((x) => x.link));
}
