import * as Immutable from "immutable";
import {Graph, Id} from "./core";
import * as D from "../data";

export type StateGraph = Graph & {textContent(id: Id): string};

export function fromState(state: D.State): StateGraph {
  return {
    all() {
      return Immutable.Set(D.allThings(state));
    },

    root() {
      return "0";
    },

    children(item: Id) {
      return Immutable.Set(D.children(state, item));
    },

    parents(item: Id) {
      return Immutable.Set(D.parents(state, item));
    },

    links(item: Id) {
      return Immutable.Set(D.references(state, item));
    },

    references(item: Id) {
      return Immutable.Set(D.backreferences(state, item));
    },

    textContent(item: Id) {
      return D.contentText(state, item);
    },
  };
}
