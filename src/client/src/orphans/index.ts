import * as A from "../app";
import * as D from "../data";

import {removeOrphanWithoutRefresh, scan} from "./core";
import {fromState} from "./integration";

export {Orphans, scan, ids} from "./core";
export {fromState} from "./integration";

export function destroy(app: A.App, thing: string): A.App {
  return A.merge(app, {
    state: D.remove(app.state, thing),
    orphans: removeOrphanWithoutRefresh(app.orphans, thing),
  });
}

export function addParent(app: A.App, thing: string, parent: string): A.App {
  const state = D.addChild(app.state, parent, thing)[0];
  const app_ = A.merge(app, {state, orphans: scan(fromState(state))});
  return A.jump(A.switchTab(app_, "outline"), parent);
}
