import {Communication} from "@thinktool/shared";

import * as A from "../app";
import * as D from "../data";
import * as T from "../tree";
import * as Tu from "../tutorial";

import type {Storage} from "../remote-types";

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

export type StoredState = {fullStateResponse: FullStateResponse; tutorialFinished: boolean};

export function storedStateFromApp(app: A.App): StoredState {
  return {
    fullStateResponse: D.transformStateIntoFullStateResponse(app.state),
    tutorialFinished: !Tu.isActive(app.tutorialState),
  };
}

export async function loadStoredStateFromStorage(storage: Storage): Promise<StoredState> {
  return {fullStateResponse: await storage.getFullState(), tutorialFinished: await storage.getTutorialFinished()};
}

export function loadAppFromStoredState(storedState: StoredState): A.App {
  return A.initialize({
    fullStateResponse: storedState.fullStateResponse,
    toolbarShown: true,
    tutorialFinished: storedState.tutorialFinished,
    urlHash: "",
  });
}

// Return changes that must be applied to bring the stored state from 'from' to
// 'to'.
export function changes(from: StoredState, to: StoredState): Changes {
  const fromState = D.transformFullStateResponseIntoState(from.fullStateResponse);
  const toState = D.transformFullStateResponseIntoState(to.fullStateResponse);

  const diff = D.diff(fromState, toState);

  const deleted = diff.deleted;

  const edited = diff.changedContent.map((thing) => ({
    thing,
    content: D.content(toState, thing),
  }));

  let updated = [...diff.added, ...diff.changed].map((thing) => ({
    name: thing,
    content: D.content(toState, thing),
    children: D.childConnections(toState, thing).map((c) => ({
      name: c.connectionId,
      child: D.connectionChild(toState, c)!,
    })),
    isPage: false,
  }));

  const tutorialFinished = from.tutorialFinished !== to.tutorialFinished ? to.tutorialFinished : null;

  return {
    deleted,
    edited,
    updated,
    tutorialFinished,
  };
}
