import * as React from "react";
import * as Misc from "@johv/miscjs";

import * as T from "../tree";
import * as U from "../tutorial";
import {App, merge, jump} from "../app";

import Bullet from "./Bullet";

import * as Editor from "./Editor";
import * as E from "../editing";
import {OtherParents} from "./OtherParents";

export type ItemKind = "child" | "reference" | "opened-link" | "parent";
export type ItemStatus = "expanded" | "collapsed" | "terminal";

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

export function status(tree: T.Tree, node: T.NodeRef): ItemStatus {
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

export function kind(tree: T.Tree, node: T.NodeRef): ItemKind {
  const maybeResult = T.kind(tree, node);
  if (maybeResult === undefined) {
    // [TODO] Why can this be undefined!?
    console.warn("We couldn't get the kind of an item. That may be a problem.");
    return "child";
  }
  return maybeResult;
}

// An item in the outline that represents a particular node in the tree. This is
// a general component that takes the list of other parents, the subtree and
// even the content editor components as props.
export function Item(props: {
  id: number;
  kind: ItemKind;
  dragState: "source" | "target" | null;
  status: ItemStatus;

  beginDrag(): void;
  onBulletClick(): void;
  onBulletAltClick(): void;

  subtree: React.ReactNode;

  otherParents: {id: string; text: string}[];
  onOtherParentClick(id: string): void;
  onOtherParentAltClick(id: string): void;

  editor: E.Editor;
  hasFocus: boolean;
  onEditEvent(event: Editor.Event): void;
}) {
  const className = Misc.classes({
    "item": true,
    "drop-target": props.dragState === "target",
    "drag-source": props.dragState === "source",
    "opened-link": props.kind === "opened-link",
  });

  return (
    <li className="subtree-container">
      {/* data-id is used for drag and drop. */}
      <div className={className} data-id={props.id}>
        <OtherParents
          otherParents={props.otherParents}
          click={props.onOtherParentClick}
          altClick={props.onOtherParentAltClick}
        />
        <Bullet
          specialType={props.kind === "child" ? undefined : props.kind}
          beginDrag={props.beginDrag}
          status={props.status}
          toggle={props.onBulletClick}
          onMiddleClick={props.onBulletAltClick}
        />
        <Editor.Editor editor={props.editor} hasFocus={props.hasFocus} onEvent={props.onEditEvent} />
      </div>
      {props.status === "expanded" && props.subtree}
    </li>
  );
}
