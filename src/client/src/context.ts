import {State} from "./data";
import * as T from "./tree";
import {Tree} from "./tree";
import * as Tutorial from "./tutorial";
import {Communication} from "@thinktool/shared";
import {Server} from "./server-api";
import {Storage} from "./storage";
import type {Receiver} from "./receiver";
import type {Message} from "./messages";

import {App} from "./app";

export {App as AppState};
export {jump, merge} from "./app";

export interface DragInfo {
  current: T.NodeRef | null;
  target: T.NodeRef | null;
  finished: boolean | "copy";
}

export interface ActiveEditor {
  selection: string;
  replaceSelectionWithLink(target: string, textContent: string): void;
}

export function setAppState(context: Context, app: App): void {
  context.setState(app.state);
  context.setTree(app.tree);
  context.setTutorialState(app.tutorialState);
  context.setChangelogShown(app.changelogShown);
  context.setEditors(app.editors);
}

export interface Context extends App {
  storage: Storage;
  server?: Server;

  state: State;
  setState(value: State): void;
  setLocalState(value: State): void;
  updateLocalState(f: (value: State) => State): void;

  tutorialState: Tutorial.State;
  setTutorialState(tutorialState: Tutorial.State): void;

  changelogShown: boolean;
  setChangelogShown(changelogShown: boolean): void;
  changelog: Communication.Changelog | "loading";

  undo(): void;

  tree: Tree;
  setTree(value: Tree): void;

  drag: DragInfo;
  setDrag(value: DragInfo): void;

  activeEditor: ActiveEditor | null;
  registerActiveEditor(activeEditor: ActiveEditor | null): void;

  openExternalUrl(url: string): void;

  send: Receiver<Message>["send"];

  setEditors(editors: App["editors"]): void;
}
