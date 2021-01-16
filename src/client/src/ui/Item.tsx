import * as React from "react";
import * as Misc from "@johv/miscjs";

import * as T from "../tree";
import * as U from "../tutorial";
import {DragInfo, merge, jump} from "../context";
import {App} from "../app";

import Bullet from "./Bullet";

export type ItemKind = "child" | "reference" | "opened-link" | "parent";
export type ItemStatus = "expanded" | "collapsed" | "terminal";

// [TODO] This feels like it belongs in a different module -- should we even
// know about DragInfo at all?
export function dragState(dragInfo: DragInfo, node: T.NodeRef): "source" | "target" | null {
  if (dragInfo.current !== null && dragInfo.target?.id === node.id) return "target";
  if (dragInfo.current?.id === node.id && dragInfo.target !== null) return "source";
  return null;
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

  otherParents: React.ReactNode;
  subtree: React.ReactNode;
  content: React.ReactNode;
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
        {props.otherParents}
        <Bullet
          specialType={props.kind === "child" ? undefined : props.kind}
          beginDrag={props.beginDrag}
          status={props.status}
          toggle={props.onBulletClick}
          onMiddleClick={props.onBulletAltClick}
        />
        {props.content}
      </div>
      {props.status === "expanded" && props.subtree}
    </li>
  );
}
