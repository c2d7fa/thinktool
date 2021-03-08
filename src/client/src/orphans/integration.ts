import * as Immutable from "immutable";
import {Graph, Id} from "./core";
import * as D from "../data";

export type StateGraph = Graph & {textContent(id: Id): string};

export function fromState(state: D.State): StateGraph {
  return {
    all() {
      return Immutable.Set(["0"]);
    },

    root() {
      return "0";
    },

    children(item: Id) {
      return Immutable.Set();
    },

    parents(item: Id) {
      return Immutable.Set();
    },

    links(item: Id) {
      return Immutable.Set();
    },

    references(item: Id) {
      return Immutable.Set();
    },

    textContent(item: Id) {
      return D.contentText(state, item);
    },
  };
}
