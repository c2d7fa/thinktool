import {Communication} from "@thinktool/shared";

import * as D from "../data";
import * as A from "../app";
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
