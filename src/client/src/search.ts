import Fuse from "fuse.js";

import * as D from "./data";

export type Result = {thing: string; content: string};

export default class Search {
  private fuse: Fuse<{thing: string; content: string}>;

  constructor(state: D.State) {
    this.fuse = new Fuse<{thing: string; content: string}>(
      D.allThings(state).map((thing) => ({thing, content: D.contentText(state, thing)})),
      {keys: ["content"], findAllMatches: true, ignoreLocation: true},
    );
  }

  query(text: string, limit: number): Result[] {
    return this.fuse
      .search(text, {limit})
      .map((match) => ({content: match.item.content, thing: match.item.thing}));
  }
}
