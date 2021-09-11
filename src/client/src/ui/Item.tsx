import * as React from "react";
import * as Misc from "@johv/miscjs";

import * as T from "../tree";
import * as U from "../tutorial";
import {App, merge, jump} from "../app";

import Bullet from "./Bullet";

import * as Editor from "./Editor";
import * as E from "../editing";
import {OtherParents} from "./OtherParents";
import {PlaceholderItem} from "./PlaceholderItem";

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

export type ItemData = {
  id: number;
  kind: ItemKind;
  dragState: "source" | "target" | null;
  hasFocus: boolean;
  status: ItemStatus;
  editor: E.Editor;
  otherParents: {id: string; text: string}[];
  openedLinks: ItemData[];
  isPlaceholderShown: boolean;
  children: ItemData[];
  references:
    | {state: "empty"}
    | {state: "collapsed"; count: number}
    | {state: "expanded"; count: number; items: ItemData[]};
};

export type ItemEvent =
  | {type: "drag"; id: number}
  | {type: "click-bullet"; id: number; alt: boolean}
  | {type: "click-parent"; thing: string; alt: boolean}
  | {type: "click-placeholder"}
  | {type: "toggle-references"; id: number}
  | {type: "unfold"; id: number}
  | {type: "edit"; id: number; event: Editor.Event};

// [TODO] Use imported stylesheets for class names

function References({linkedItem, onItemEvent}: {linkedItem: ItemData; onItemEvent: (event: ItemEvent) => void}) {
  if (linkedItem.references.state === "empty") return null;

  const text = `${linkedItem.references.count} References${linkedItem.references.state === "collapsed" && "..."}`;

  const items =
    linkedItem.references.state !== "expanded"
      ? null
      : linkedItem.references.items.map((reference) => (
          <Item key={reference.id} item={reference} onItemEvent={onItemEvent} />
        ));

  return (
    <>
      <li className="item">
        <div>
          <button
            onClick={() => onItemEvent({type: "toggle-references", id: linkedItem.id})}
            className="backreferences-text"
          >
            {text}
          </button>
        </div>
      </li>
      {items}
    </>
  );
}

export function Subtree({parent, onItemEvent}: {parent: ItemData; onItemEvent: (event: ItemEvent) => void}) {
  const children = parent.children.map((child) => <Item key={child.id} item={child} onItemEvent={onItemEvent} />);
  const openedLinks = parent.openedLinks.map((link) => (
    <Item key={link.id} item={link} onItemEvent={onItemEvent} />
  ));

  return (
    <ul className="subtree">
      {openedLinks}
      {children}
      {parent.isPlaceholderShown && <PlaceholderItem onCreate={() => onItemEvent({type: "click-placeholder"})} />}
      <References linkedItem={parent} onItemEvent={onItemEvent} />
    </ul>
  );
}

export const Item = React.memo(
  function Item({item, onItemEvent}: {item: ItemData; onItemEvent: (event: ItemEvent) => void}) {
    const className = Misc.classes({
      "item": true,
      "drop-target": item.dragState === "target",
      "drag-source": item.dragState === "source",
      "opened-link": item.kind === "opened-link",
    });

    return (
      <li className="subtree-container">
        {/* data-id is used for drag and drop. */}
        <div className={className} data-id={item.id}>
          <OtherParents
            otherParents={item.otherParents}
            click={(thing) => onItemEvent({type: "click-parent", thing, alt: false})}
            altClick={(thing) => onItemEvent({type: "click-parent", thing, alt: true})}
          />
          <Bullet
            specialType={item.kind === "child" ? undefined : item.kind}
            beginDrag={() => onItemEvent({type: "drag", id: item.id})}
            status={item.status}
            toggle={() => onItemEvent({type: "click-bullet", id: item.id, alt: false})}
            onMiddleClick={() => onItemEvent({type: "click-bullet", id: item.id, alt: true})}
          />
          <Editor.Editor
            editor={item.editor}
            hasFocus={item.hasFocus}
            onEvent={(event) => onItemEvent({type: "edit", id: item.id, event})}
          />
        </div>
        {item.status === "expanded" && <Subtree parent={item} onItemEvent={onItemEvent} />}
      </li>
    );
  },
  (prev, next) => JSON.stringify(prev.item) === JSON.stringify(next.item) && prev.onItemEvent === next.onItemEvent,
);
