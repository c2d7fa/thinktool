import {Communication} from "@thinktool/shared";
import * as D from "./data";

export function receiveChangedThingsFromServer(
  state: D.State,
  changedThings: {thing: string; data: Communication.ThingData | null}[],
): D.State {
  let newState = state;

  for (const {thing, data} of changedThings) {
    if (data === null) {
      // Thing was deleted
      newState = D.remove(newState, thing);
      continue;
    }

    if (!D.exists(newState, thing)) {
      // A new item was created
      newState = D.create(newState, thing)[0];
    }

    newState = D.setContent(newState, thing, data.content);

    const nChildren = D.children(newState, thing).length;
    for (let i = 0; i < nChildren; ++i) {
      newState = D.removeChild(newState, thing, 0);
    }
    for (const childConnection of data.children) {
      newState = D.addChild(newState, thing, childConnection.child, childConnection.name)[0];
    }
  }

  return newState;
}
