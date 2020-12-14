// This is a wrapper around an AppState. We use this for some of our tests to
// make it easier to read.

import * as C from "./context";
import * as D from "./data";
import * as T from "./tree";

export interface Wrapap {
  root: Node;
  map(f: (app: C.AppState) => C.AppState): Wrapap;
}

export interface Node {
  child(index: number): Node | undefined;
  parent(index: number): Node | undefined;
  references: Node[];
  reference(index: number): Node | undefined;
  thing: string;
  expanded: boolean;
  expand(): Wrapap;
  ref: T.NodeRef;
}

export function from(app: C.AppState): Wrapap {
  function node(ref: T.NodeRef) {
    return {
      child(index: number) {
        const childRef = T.children(app.tree, ref)[index];
        if (childRef === undefined) return undefined;
        return node(childRef);
      },

      get references() {
        return T.backreferencesChildren(app.tree, ref).map(node);
      },

      reference(index: number) {
        const referenceRef = T.backreferencesChildren(app.tree, ref)[index];
        if (referenceRef === undefined) return undefined;
        return node(referenceRef);
      },

      parent(index: number) {
        const referenceRef = T.otherParentsChildren(app.tree, ref)[index];
        if (referenceRef === undefined) return undefined;
        return node(referenceRef);
      },

      expand() {
        return from(C.merge(app, {tree: T.expand(app.state, app.tree, ref)}));
      },

      get thing() {
        return T.thing(app.tree, ref);
      },

      get expanded() {
        return T.expanded(app.tree, ref);
      },

      get ref() {
        return ref;
      },
    };
  }

  const wrapap = {
    get root() {
      return node(T.root(app.tree));
    },

    map(f: (app: C.AppState) => C.AppState) {
      return from(f(app));
    },
  };

  return wrapap;
}
