// This is a stateful wrapper around an App. We use this for some of our tests.

import {App} from "./app";
import * as A from "./app";

import type {GoalId} from "./goal";
import type {Editor, EditorContent} from "./editor";

export interface Wrapap {
  root: Node;
  completed(goal: GoalId): boolean;
  map(f: (app: App) => App): Wrapap;
  send(...events: A.Event[]): Wrapap;
  focused: Node | undefined;
  selection: Editor["selection"] | undefined;
  parent(index: number): Node | undefined;
  view: A.View;

  app: App;
}

export interface Node {
  item: A.Item;
  nchildren: number;
  openedLinks: Node[];
  child(index: number): Node | undefined;
  references: Node[];
  reference(index: number): Node | undefined;
  expanded: boolean;
  expand(): Wrapap;
  ref: {id: number};
  toggleLink(link: string): Wrapap;
  link(index: number): Node;
  destroy(): Wrapap;
  edit(editor: Partial<Editor>): Wrapap;
  edit(): Wrapap;
  content: EditorContent;
}

export function of(items: A.ItemGraph): Wrapap {
  return from(A.of(items));
}

export function from(app: App): Wrapap {
  function send(...events: A.Event[]) {
    return from(A.after(app, events));
  }

  function node(item: A.Item): Node {
    const references = item.references.state === "expanded" ? item.references.items.map(node) : [];

    function edit(editor?: Partial<Editor>) {
      return from(A.update(app, {type: "edit", id: item.id, editor: editor ?? {}, focused: true}));
    }

    return {
      get item() {
        return item;
      },

      get nchildren() {
        return item.children.length;
      },

      get openedLinks(): Node[] {
        return item.openedLinks.map(node);
      },

      child(index: number) {
        return node(item.children[index]);
      },

      get references() {
        return references;
      },

      reference(index: number) {
        return references[index];
      },

      expand() {
        return send({type: "click-bullet", alt: false, id: item.id});
      },

      get expanded() {
        return item.status !== "collapsed";
      },

      get ref() {
        return {id: item.id};
      },

      toggleLink(link: string) {
        return send({type: "open", id: item.id, link});
      },

      link(index: number) {
        return node(item.openedLinks[index]);
      },

      destroy() {
        return edit().send({type: "action", action: "destroy"});
      },

      edit,

      get content() {
        return item.editor.content;
      },
    };
  }

  function focused() {
    function findFocused(item: A.Item): A.Item | undefined {
      if (item.hasFocus) return item;
      for (const child of item.children) {
        const found = findFocused(child);
        if (found) return found;
      }
      return undefined;
    }

    const found = findFocused((A.view(app) as A.Outline).root);
    return found ? node(found) : undefined;
  }

  const wrapap = {
    get root() {
      return node((A.view(app) as A.Outline).root);
    },

    get view() {
      return A.view(app);
    },

    get app() {
      return app;
    },

    get focused() {
      return focused();
    },

    get selection() {
      return focused()?.item.editor.selection;
    },

    completed(goal: GoalId) {
      const withTutorialOpen = A.view(app).tutorial.open
        ? app
        : A.after(app, [{type: "action", action: "tutorial"}]);

      return (A.view(withTutorialOpen).tutorial as A.View["tutorial"] & {open: true}).goals[goal].completed;
    },

    map(f: (app: App) => App) {
      return from(f(app));
    },

    parent(index: number) {
      return node((A.view(app) as A.Outline).parents[index]);
    },

    send,
  };

  return wrapap;
}
