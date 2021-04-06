import * as A from "../app";
import * as D from "../data";

import {removeOrphanWithoutRefresh} from "./core";

export {Orphans, scan, ids} from "./core";
export {fromState} from "./integration";

export function destroy(app: A.App, thing: string): A.App {
  return A.merge(app, {
    state: D.remove(app.state, thing),
    orphans: removeOrphanWithoutRefresh(app.orphans, thing),
  });
}
