import type * as D from "./data";
import type * as T from "./tree"

import {ActionName} from "./actions";
import {NodeRef} from "./tree-internal";

export type Message = {
  "toolbar": {button: ActionName; target: NodeRef | null};
  "start-popup": {
    target: NodeRef | null;
    complete: (state: D.State, tree: T.Tree, target: NodeRef, selection: string) => [D.State, T.Tree];
  };
};
