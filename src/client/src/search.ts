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

  // For large queries, the search can be quite slow. When this happens, it
  // blocks the UI. Unfortunately, just making this method async is not enough
  // to fix this issue, since all the work still happens at once in that case.
  // If we wanted to fix this, I think we should look into Web Workers.
  query(text: string, limit: number): Result[] {
    return this.fuse
      .search(text, {limit})
      .map((match) => ({content: match.item.content, thing: match.item.thing}));
  }
}
