import {ActionName} from "./actions";
import {NodeRef} from "./tree-internal";

export type Message = {
  "toolbar": {button: ActionName, target: NodeRef | null},
}
