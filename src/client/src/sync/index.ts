import * as A from "../app";
import {SerializableAppState, SerializableAppUpdate} from "../remote-types";

import * as Dialog from "./dialog";
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
