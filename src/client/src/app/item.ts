import * as T from "../tree";
import * as U from "../tutorial";
import * as D from "../data";
import * as PlaceholderItem from "../ui/PlaceholderItem";
import * as R from "./drag";
import {App, merge, jump} from ".";

import * as E from "../editor";

export type Kind = "child" | "reference" | "opened-link" | "parent" | "root";
export type Status = "expanded" | "collapsed" | "terminal";

export function itemFromNode(app: App, node: T.NodeRef, parent?: T.NodeRef): Item {
  const otherParents = D.otherParents(app.state, T.thing(app.tree, node), parent && T.thing(app.tree, parent)).map(
    (id) => ({id, text: D.contentText(app.state, id)}),
  );

  const backreferences = D.backreferences(app.state, T.thing(app.tree, node));

  const editor = E.forNode(app, node);

  return {
    id: node.id,
    kind: kind(app.tree, node),
    dragState: R.node(app.drag, node),
    hasFocus: editor.hasFocus,
    status: status(app.tree, node),
    editor: editor.editor,
    otherParents: otherParents,
    openedLinks: T.openedLinksChildren(app.tree, node).map((n) => itemFromNode(app, n, node)),
    isPlaceholderShown: PlaceholderItem.isVisible(app) && T.root(app.tree).id === node.id,
    children:
      status(app.tree, node) === "expanded"
        ? T.children(app.tree, node).map((n) => itemFromNode(app, n, node))
        : [],
    references:
      backreferences.length === 0
        ? {state: "empty"}
        : !T.backreferencesExpanded(app.tree, node)
        ? {state: "collapsed", count: backreferences.length}
        : {
            state: "expanded",
            count: backreferences.length,
            items: T.backreferencesChildren(app.tree, node).map((n) => itemFromNode(app, n)),
          },
  };
}

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
  | {type: "edit"; id: number; event: E.Event};
