// This is a stateful wrapper around an App. We use this for some of our tests.

import {App, merge} from "./app";
import * as A from "./app";

import * as D from "./data";
import * as T from "./tree";
import * as G from "./goal";
import * as U from "./tutorial";
import * as E from "./editing";

export interface Wrapap {
  root: Node;
  completed(goal: G.GoalId): boolean;
  map(f: (app: App) => App): Wrapap;

  app: App;
  tree: T.Tree;
  state: D.State;
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
  toggleLink(link: string): Wrapap;
  link(index: number): Node;
  destroy(): Wrapap;
  edit(editor: E.Editor): Wrapap;
}

export function from(app: App): Wrapap {
  function node(ref: T.NodeRef): Node {
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
        return from(merge(app, {tree: T.expand(app.state, app.tree, ref)}));
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

      toggleLink(link: string) {
        return from(merge(app, {tree: T.toggleLink(app.state, app.tree, ref, link)}));
      },

      link(index: number) {
        return node(T.openedLinksChildren(app.tree, ref)[index]);
      },

      destroy() {
        const [state, tree] = T.removeThing(app.state, app.tree, ref);
        return from(merge(app, {state, tree}));
      },

      edit(editor) {
        return from(A.edit(app, ref, editor));
      },
    };
  }

  const wrapap = {
    get root() {
      return node(T.root(app.tree));
    },

    get tree() {
      return app.tree;
    },

    get state() {
      return app.state;
    },

    get app() {
      return app;
    },

    completed(goal: G.GoalId) {
      return U.isGoalFinished(app.tutorialState, goal);
    },

    map(f: (app: App) => App) {
      return from(f(app));
    },
  };

  return wrapap;
}
