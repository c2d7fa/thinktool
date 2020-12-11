import type * as D from "./data";
import type * as T from "./tree";

import {ActionName} from "./actions";
import {NodeRef} from "./tree-internal";

export type Message = {
  toolbar: {button: ActionName; target: NodeRef | null};
  action: {action: ActionName};
  "start-popup": {
    target: NodeRef | null;
    complete: (state: D.State, tree: T.Tree, target: NodeRef, selection: string) => void;
  };
};
