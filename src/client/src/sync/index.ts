import {Communication} from "@thinktool/shared";

import * as A from "../app";
import * as D from "../data";
import * as T from "../tree";
import * as Tu from "../tutorial";

import * as Dialog from "./dialog";
import {FullStateResponse} from "@thinktool/shared/dist/communication";
import {SerializableAppState, SerializableAppUpdate} from "../remote-types";
export {Dialog};

export function mergeUpdateIntoSerializable(
  state: SerializableAppState,
  update: SerializableAppUpdate,
): SerializableAppState {
  return state;
}

export function mergeUpdateIntoApp(app: A.App, update: SerializableAppUpdate): A.App {
  return app;
}

export function updatesSince(lastSTate: SerializableAppState, currentApp: A.App): SerializableAppUpdate {
  return {};
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
