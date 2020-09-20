import Fuse from "fuse.js";

import * as D from "./data";

export type Result = {thing: string; content: string};

export default class Search {
  private fuse = new Fuse<{thing: string; content: string}>([], {
    keys: ["content"],
    findAllMatches: true,
    ignoreLocation: true,
  });

  constructor(state: D.State) {
    this.fuse.setCollection(
      D.allThings(state).map((thing) => ({thing, content: D.contentText(state, thing)})),
    );
  }

  query(text: string, limit: number): Result[] {
    return this.fuse
      .search(text, {limit})
      .map((match) => ({content: match.item.content, thing: match.item.thing}));
  }
}
