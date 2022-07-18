import {Communication} from "@thinktool/shared";

import * as A from "../app";
import * as D from "../data";
import * as T from "../tree";
import * as Tu from "../tutorial";

import * as Dialog from "./dialog";
import {FullStateResponse} from "@thinktool/shared/dist/communication";
export {Dialog};

export function receiveChangedThingsFromServer(
  app: A.App,
  changedThings: {thing: string; data: Communication.ThingData | null | {error: unknown}}[],
): A.App {
  let state = app.state;

  // First check for any errors.
  for (const {thing, data} of changedThings) {
    if (data !== null && "error" in data) {
      console.warn("Error while reading changes from server!");
      return A.update(app, {type: "serverDisconnected"});
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

export const emptyChanges = {
  deleted: [],
  edited: [],
  updated: [],
  tutorialFinished: null,
};

export function noChanges(changes: Changes): boolean {
  return (
    changes.deleted.length === 0 &&
    changes.edited.length === 0 &&
    changes.updated.length === 0 &&
    changes.tutorialFinished === null
  );
}

export type StoredState = {fullStateResponse: FullStateResponse; tutorialFinished: boolean};

export function storedStateFromApp(app: A.App): StoredState {
  return {
    fullStateResponse: D.transformStateIntoFullStateResponse(app.state),
    tutorialFinished: !Tu.isActive(app.tutorialState),
  };
}

export function loadAppFromStoredState(storedState: StoredState): A.App {
  return A.initialize({
    fullStateResponse: storedState.fullStateResponse,
    toolbarShown: true,
    tutorialFinished: storedState.tutorialFinished,
    urlHash: "",
  });
}

export function applyChanges(state: StoredState, changes: Changes): StoredState {
  let result = state;

  if (changes.tutorialFinished !== null) {
    result = {...result, tutorialFinished: changes.tutorialFinished};
  }

  for (const thing of changes.deleted) {
    result.fullStateResponse.things = result.fullStateResponse.things.filter((thing_) => thing_.name !== thing);
  }

  for (const {thing, content} of changes.edited) {
    result.fullStateResponse.things = result.fullStateResponse.things.map((thing_) =>
      thing_.name === thing ? {...thing_, content} : thing_,
    );
  }

  for (const {name, content, children} of changes.updated) {
    result.fullStateResponse.things = result.fullStateResponse.things.map((thing_) =>
      thing_.name === name ? {name, content, children} : thing_,
    );
  }

  return result;
}

// Return changes that must be applied to bring the stored state from 'from' to
// 'to'.
export function changes(from: StoredState, to: StoredState): Changes {
  let allThings = new Set<string>();
  const fromMap = new Map<string, StoredState["fullStateResponse"]["things"][number]>();
  const toMap = new Map<string, StoredState["fullStateResponse"]["things"][number]>();

  for (const thing of from.fullStateResponse.things) {
    fromMap.set(thing.name, thing);
    allThings.add(thing.name);
  }

  for (const thing of to.fullStateResponse.things) {
    toMap.set(thing.name, thing);
    allThings.add(thing.name);
  }

  let deleted: string[] = [];
  let edited: Changes["edited"] = [];
  let updated: Changes["updated"] = [];

  for (const name of allThings) {
    const fromThing = fromMap.get(name);
    const toThing = toMap.get(name);

    if (fromThing === undefined) updated.push(toThing!);
    else if (toThing === undefined) deleted.push(name);
    else if (JSON.stringify(fromThing) === JSON.stringify(toThing)) continue;
    else if (JSON.stringify(fromThing?.children) === JSON.stringify(toThing?.children))
      edited.push({thing: name, content: toThing!.content});
    else updated.push(toThing!);
  }

  const tutorialFinished = from.tutorialFinished !== to.tutorialFinished ? to.tutorialFinished : null;

  return {
    deleted,
    edited,
    updated,
    tutorialFinished,
  };
}
