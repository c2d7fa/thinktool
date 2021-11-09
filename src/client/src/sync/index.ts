import {Communication} from "@thinktool/shared";

import * as A from "../app";
import * as D from "../data";
import * as T from "../tree";

export function receiveChangedThingsFromServer(
  app: A.App,
  changedThings: {thing: string; data: Communication.ThingData | null | {error: unknown}}[],
): A.App {
  let state = app.state;

  // First check for any errors.
  for (const {thing, data} of changedThings) {
    if (data !== null && "error" in data) {
      console.warn("Error while reading changes from server!");
      return A.serverDisconnected(app);
    }
  }

  // There were no errors, continue as normal:

  for (const {thing, data} of changedThings) {
    if (data === null) {
      // Thing was deleted
      state = D.remove(state, thing);
      continue;
    }

    if (!D.exists(state, thing)) {
      // A new item was created
      state = D.create(state, thing)[0];
    }

    if ("error" in data) throw "invalid state"; // We already checked for this!

    state = D.setContent(state, thing, data.content);

    const nChildren = D.children(state, thing).length;
    for (let i = 0; i < nChildren; ++i) {
      state = D.removeChild(state, thing, 0);
    }
    for (const childConnection of data.children) {
      state = D.addChild(state, thing, childConnection.child, childConnection.name)[0];
    }
  }

  const tree = T.refresh(app.tree, state);
  return A.merge(app, {state, tree});
}

import * as Tu from "../tutorial";

export type Changes = {
  deleted: string[];
  edited: {thing: string; content: Communication.Content}[];
  updated: {
    name: string;
    content: Communication.Content;
    children: {name: string; child: string}[];
  }[];
  tutorialFinished: boolean | null;
};

// [TODO] Generalize first argument to be StorageState, instead of requiring an
// actual App.
export function changes(before: A.App, after: A.App): Changes {
  const diff = D.diff(before.state, after.state);

  const deleted = diff.deleted;

  const edited = diff.changedContent.map((thing) => ({
    thing,
    content: D.content(after.state, thing),
  }));

  let updated = [...diff.added, ...diff.changed].map((thing) => ({
    name: thing,
    content: D.content(after.state, thing),
    children: D.childConnections(after.state, thing).map((c) => ({
      name: c.connectionId,
      child: D.connectionChild(after.state, c)!,
    })),
    isPage: false,
  }));

  return {
    deleted,
    edited,
    updated,
    tutorialFinished: (Tu.isActive(before.tutorialState) && !Tu.isActive(after.tutorialState)) || null,
  };
}
