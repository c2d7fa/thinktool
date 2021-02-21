import {State} from "./data";
import * as T from "./tree";
import {Tree} from "./tree";
import {Server} from "./server-api";
import {Storage} from "./storage";
import type {Receiver} from "./receiver";
import type {Message} from "./messages";
import type {Drag} from "./drag";

import {App} from "./app";

export type DragInfo = Drag;

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
  setTree(value: Tree): void;

  storage: Storage;
  server?: Server;

  updateLocalState(f: (value: State) => State): void;

  drag: DragInfo;
  setDrag(value: DragInfo): void;

  openExternalUrl(url: string): void;

  send: Receiver<Message>["send"];
}
