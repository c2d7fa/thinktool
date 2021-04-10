import Fuse from "fuse.js";

export type Result = {thing: string; content: string};

export class Search {
  private fuse: Fuse<{thing: string; content: string}>;
  private resultsCallbacks: ((results: Result[]) => void)[];

  constructor(data: {thing: string; content: string}[]) {
    this.resultsCallbacks = [];
    this.fuse = new Fuse<{thing: string; content: string}>(data, {
      keys: ["content"],
      findAllMatches: true,
      ignoreLocation: true,
    });
  }

  query(text: string, limit: number): void {
    const results = this.fuse
      .search(text, {limit})
      .map((match) => ({content: match.item.content, thing: match.item.thing}));
    this.emitResults(results);
  }

  on(event: "results", callback: (results: Result[]) => void): void {
    this.resultsCallbacks.push(callback);
  }

  private emitResults(results: Result[]) {
    this.resultsCallbacks.forEach((callback) => callback(results));
  }
}
