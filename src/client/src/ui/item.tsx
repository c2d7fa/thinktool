import * as React from "react";
import * as Misc from "@johv/miscjs";

import * as A from "../app";

import Bullet from "./Bullet";

import * as Editor from "./editor";
import {OtherParents} from "./OtherParents";
import {PlaceholderItem} from "./PlaceholderItem";

// [TODO] Use imported stylesheets for class names

function References({linkedItem, onItemEvent}: {linkedItem: A.Item; onItemEvent: (event: A.ItemEvent) => void}) {
  if (linkedItem.references.state === "empty") return null;

  const text = `${linkedItem.references.count} References${
    linkedItem.references.state === "collapsed" ? "..." : ""
  }`;

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

export function Subtree({parent, onItemEvent}: {parent: A.Item; onItemEvent: (event: A.ItemEvent) => void}) {
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
  function Item({item, onItemEvent}: {item: A.Item; onItemEvent: (event: A.ItemEvent) => void}) {
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
            specialType={item.kind === "child" || item.kind === "root" ? undefined : item.kind}
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
