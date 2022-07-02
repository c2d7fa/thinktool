// This is a stateful wrapper around an App. We use this for some of our tests.

import {App, merge} from "./app";
import * as A from "./app";

import * as D from "./data";
import * as T from "./tree";
import * as G from "./goal";
import * as U from "./tutorial";
import * as E from "./editor";

export interface Wrapap {
  root: Node;
  completed(goal: G.GoalId): boolean;
  map(f: (app: App) => App): Wrapap;
  send(...events: A.Event[]): Wrapap;
  focused: Node | undefined;
  selection: E.Editor["selection"] | undefined;

  app: App;
  tree: T.Tree;
  state: D.State;
}

export interface Node {
  nchildren: number;
  openedLinks: Node[];
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
  edit(editor: Partial<E.Editor>): Wrapap;
  edit(): Wrapap;
  content: E.EditorContent;
}

export function of(items: A.ItemGraph): Wrapap {
  return from(A.of(items));
}

export function from(app: App): Wrapap {
  function send(...events: A.Event[]) {
    return from(A.after(app, events));
  }

  function node(ref: T.NodeRef): Node {
    return {
      get nchildren() {
        return T.children(app.tree, ref).length;
      },

      get openedLinks(): Node[] {
        return T.openedLinksChildren(app.tree, ref).map((child) => node(child));
      },

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
        return send({type: "open", id: ref.id, link});
      },

      link(index: number) {
        return node(T.openedLinksChildren(app.tree, ref)[index]);
      },

      destroy() {
        const [state, tree] = T.removeThing(app.state, app.tree, ref);
        return from(merge(app, {state, tree}));
      },

      edit(editor?: Partial<E.Editor>) {
        return from(A.update(app, {type: "edit", id: ref.id, editor: editor ?? {}, focused: true}));
      },

      get content() {
        return A.editor(app, ref)?.content ?? [];
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

    get focused() {
      const focusedId = A.focusedId(app);
      return focusedId ? node({id: focusedId}) : undefined;
    },

    get selection() {
      return A.focusedEditor(app)?.selection ?? undefined;
    },

    completed(goal: G.GoalId) {
      const withTutorialOpen = A.view(app).tutorial.open
        ? app
        : A.after(app, [{type: "action", action: "tutorial"}]);

      return (A.view(withTutorialOpen).tutorial as A.View["tutorial"] & {open: true}).goals[goal].completed;
    },

    map(f: (app: App) => App) {
      return from(f(app));
    },

    send,
  };

  return wrapap;
}
