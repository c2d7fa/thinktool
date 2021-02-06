import {Communication} from "@thinktool/shared";

import * as D from "../data";
import * as A from "../app";
import * as Tu from "../tutorial";

// When the user does something, we need to update both the local state and the
// state on the server. We can't just send over the entire state to the server
// each time; instead we use a REST API to make small changes.
//
// However, when we use library functions like Tree.moveToAbove (for example),
// we just get back the new state, not each of the steps needed to bring the old
// state to the new state. In this case, we have to go through and
// retrospectively calculate the changes that we need to send to the server.
//
// In theory, we would prefer to write our code such that we always know exactly
// what to send to the server. In practice, we use diffState quite frequently.

export type Effects = {
  deleted: string[];
  edited: {thing: string; content: Communication.Content}[];
  updated: {
    name: string;
    content: Communication.Content;
    children: {name: string; child: string}[];
    isPage: boolean; // [TODO] We don't use isPage anymore.
  }[];
  tutorialFinished: boolean | null;
};

export function effects(before: A.App, after: A.App): Effects {
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
