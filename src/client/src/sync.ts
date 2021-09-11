import {Communication} from "@thinktool/shared";

import * as A from "./app";
import * as D from "./data";
import * as T from "./tree";

export function receiveChangedThingsFromServer(
  app: A.App,
  changedThings: {thing: string; data: Communication.ThingData | null}[],
): A.App {
  let state = app.state;

  for (const {thing, data} of changedThings) {
    if (data === null) {
      // Thing was deleted
      state = D.remove(state, thing);
      continue;
    }

    if (!D.exists(state, thing)) {
      // A new item was created
      state = D.create(state, thing)[0];
    }

    state = D.setContent(state, thing, data.content);

    const nChildren = D.children(state, thing).length;
    for (let i = 0; i < nChildren; ++i) {
      state = D.removeChild(state, thing, 0);
    }
    for (const childConnection of data.children) {
      state = D.addChild(state, thing, childConnection.child, childConnection.name)[0];
    }
  }

  const tree = T.refresh(app.tree, state);
  return A.merge(app, {state, tree});
}
