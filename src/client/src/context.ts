import type {Receiver} from "./receiver";
import type {Message} from "./messages";

import {App} from "./app";

export interface Context extends App {
  setApp(app: App): void;
  updateAppWithoutSaving(f: (app: App) => App): void;
  openExternalUrl(url: string): void;
  send: Receiver<Message>["send"];
}
