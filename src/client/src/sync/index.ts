import {Communication} from "@thinktool/shared";

import * as A from "../app";
import * as D from "../data";
import * as Tu from "../tutorial";

import * as Dialog from "./dialog";
import {FullStateResponse} from "@thinktool/shared/dist/communication";
import {App} from "../main";
export {Dialog};

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

function storedStateFromApp(app: A.App): StoredState {
  return {
    fullStateResponse: D.transformStateIntoFullStateResponse(app.state),
    tutorialFinished: !Tu.isActive(app.tutorialState),
  };
}

function loadAppFromStoredState(storedState: StoredState): A.App {
  return A.initialize({
    fullStateResponse: storedState.fullStateResponse,
    toolbarShown: true,
    tutorialFinished: storedState.tutorialFinished,
    urlHash: "",
  });
}

function applyChanges(state: StoredState, changes: Changes): StoredState {
  let result = state;

  if (changes.tutorialFinished !== null) {
    result = {...result, tutorialFinished: changes.tutorialFinished};
  }

  for (const thing of changes.deleted) {
    result = {
      ...result,
      fullStateResponse: {
        things: {
          ...result.fullStateResponse.things.filter((thing_) => thing_.name !== thing),
        },
      },
    };
  }

  for (const {thing, content} of changes.edited) {
    result = {
      ...result,
      fullStateResponse: {
        things: result.fullStateResponse.things.map((thing_) =>
          thing_.name === thing ? {...thing_, content} : thing_,
        ),
      },
    };
  }

  for (const {name, content, children} of changes.updated) {
    let found = false;
    result = {
      ...result,
      fullStateResponse: {
        things: result.fullStateResponse.things.map((thing_) => {
          if (thing_.name === name) {
            found = true;
            return {...thing_, content, children};
          } else {
            return thing_;
          }
        }),
      },
    };

    if (!found) {
      result = {
        ...result,
        fullStateResponse: {
          things: [...result.fullStateResponse.things, {name, content, children}],
        },
      };
    }
  }

  return result;
}

// Return changes that must be applied to bring the stored state from 'from' to
// 'to'.
function changes(from: StoredState, to: StoredState): Changes {
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

function translateServerChanges(
  changedThings: {thing: string; data: Communication.ThingData | null | {error: unknown}}[],
): Changes {
  const deleted: string[] = [];
  const updated: Changes["updated"] = [];

  for (const {thing, data} of changedThings) {
    if (data === null) {
      deleted.push(thing);
      continue;
    }

    if ("error" in data) {
      console.error("Error while reading changes from server!");
      break;
    }

    updated.push({name: thing, content: data.content, children: data.children});
  }

  return {deleted, edited: [], updated, tutorialFinished: null};
}

export function pendingChangesAfterReconnect(app: A.App, remoteState: StoredState): Changes {
  return changes(storedStateFromApp(app), remoteState);
}

export function pickConflict(app: A.App, pendingChanges: Changes, choice: "commit" | "abort"): A.App {
  if (choice === "commit") {
    return app;
  } else {
    return loadAppFromStoredState(applyChanges(storedStateFromApp(app), pendingChanges));
  }
}

export function receiveChanges(
  app: A.App,
  changedThings: {thing: string; data: Communication.ThingData | null | {error: unknown}}[],
): {app: A.App; remoteState: StoredState} {
  const remoteState = applyChanges(storedStateFromApp(app), translateServerChanges(changedThings));
  return {app: loadAppFromStoredState(remoteState), remoteState};
}

export function pushedSync(remote: StoredState, current: A.App): {changes: Changes; remoteState: StoredState} {
  return {changes: changes(remote, storedStateFromApp(current)), remoteState: storedStateFromApp(current)};
}
