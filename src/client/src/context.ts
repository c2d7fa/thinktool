import {State} from "./data";
import * as T from "./tree";
import {Tree} from "./tree";
import * as Tutorial from "./tutorial";
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
  context.setApp(app);
}

export interface Context extends App {
  setApp(app: App): void;
  setState(value: State): void;
  setTutorialState(tutorialState: Tutorial.State): void;
  setChangelogShown(changelogShown: boolean): void;
  setTree(value: Tree): void;
  setEditors(editors: App["editors"]): void;

  storage: Storage;
  server?: Server;

  setLocalState(value: State): void;
  updateLocalState(f: (value: State) => State): void;

  drag: DragInfo;
  setDrag(value: DragInfo): void;

  openExternalUrl(url: string): void;

  send: Receiver<Message>["send"];
}
