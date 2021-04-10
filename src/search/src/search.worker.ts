declare function postMessage(message: any): void;

import Fuse from "fuse.js";

type Item = {thing: string; content: string};

let fuse: Fuse<Item> = new Fuse([]);

self.onmessage = (ev: MessageEvent) => {
  if (ev.data.tag === "initialize") {
    fuse = new Fuse<{thing: string; content: string}>(ev.data.data, {
      keys: ["content"],
      findAllMatches: true,
      ignoreLocation: true,
    });
  } else if (ev.data.tag === "query") {
    const results = fuse
      .search(ev.data.text, {limit: ev.data.limit})
      .map((match) => ({content: match.item.content, thing: match.item.thing}));
    postMessage({tag: "results", results});
  }
};

// Make TypeScript happy. This probably isn't what you're supposed to do.
export default (undefined as any) as new () => Worker;
