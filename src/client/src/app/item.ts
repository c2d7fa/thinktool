import * as T from "../tree";
import * as U from "../tutorial";
import {App, merge, jump} from ".";

import * as Editor from "../ui/Editor";

import * as E from "../editing";

export type Kind = "child" | "reference" | "opened-link" | "parent" | "root";
export type Status = "expanded" | "collapsed" | "terminal";

export function click(app: App, node: T.NodeRef): App {
  const kind = T.kind(app.tree, node);

  if (kind === "opened-link") {
    return merge(app, {
      tree: T.toggleLink(app.state, app.tree, T.parent(app.tree, node)!, T.thing(app.tree, node)),
    });
  } else if (kind === "child" || kind === "reference") {
    const tree = T.toggle(app.state, app.tree, node);
    app = merge(app, {
      tutorialState: U.action(app.tutorialState, {
        action: "toggled-item",
        newTree: tree,
        node: node,
      }),
    });
    app = merge(app, {tree});
    return app;
  } else if (kind === "parent") {
    app = jump(app, T.thing(app.tree, node));
    return app;
  } else {
    console.error("Called unimplemented click; doing nothing.");
    return app;
  }
}

export function altClick(app: App, node: T.NodeRef): App {
  const kind = T.kind(app.tree, node);

  if (kind === "opened-link" || kind === "child" || kind === "reference") {
    app = jump(app, T.thing(app.tree, node));
    return app;
  } else if (kind === "parent") {
    return merge(app, {tree: T.toggle(app.state, app.tree, node)});
  } else {
    console.error("Called unimplemented altClick; doing nothing.");
    return app;
  }
}

export function status(tree: T.Tree, node: T.NodeRef): Status {
  if (!T.expanded(tree, node)) {
    return "collapsed";
  } else if (
    T.children(tree, node).length === 0 &&
    T.otherParentsChildren(tree, node).length === 0 &&
    T.backreferencesChildren(tree, node).length === 0 &&
    T.openedLinksChildren(tree, node).length === 0
  ) {
    return "terminal";
  } else {
    return "expanded";
  }
}

export function kind(tree: T.Tree, node: T.NodeRef): Kind {
  const kind_ = T.kind(tree, node);
  if (!kind_) {
    console.error("Was asked to find kind of non-existent node. This should never happen!");
    return "child";
  }
  return kind_;
}

export type Item = {
  id: number;
  kind: Kind;
  dragState: "source" | "target" | null;
  hasFocus: boolean;
  status: Status;
  editor: E.Editor;
  otherParents: {id: string; text: string}[];
  openedLinks: Item[];
  isPlaceholderShown: boolean;
  children: Item[];
  references:
    | {state: "empty"}
    | {state: "collapsed"; count: number}
    | {state: "expanded"; count: number; items: Item[]};
};

export type Event =
  | {type: "drag"; id: number}
  | {type: "click-bullet"; id: number; alt: boolean}
  | {type: "click-parent"; thing: string; alt: boolean}
  | {type: "click-placeholder"}
  | {type: "toggle-references"; id: number}
  | {type: "unfold"; id: number}
  | {type: "edit"; id: number; event: Editor.Event};
