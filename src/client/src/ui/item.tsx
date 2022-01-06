import * as React from "react";
import * as Misc from "@johv/miscjs";

import * as A from "../app";

import Bullet from "./Bullet";

import * as Editor from "./editor";
import {OtherParents} from "./OtherParents";
import {PlaceholderItem} from "./PlaceholderItem";

const styles = require("./item.module.scss").default;

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
      <li className={styles.item}>
        <div>
          <button
            onClick={() => onItemEvent({type: "toggle-references", id: linkedItem.id})}
            className={styles.backreferencesText}
          >
            {text}
          </button>
        </div>
      </li>
      {items}
    </>
  );
}

export function SubtreeLayout(props: {children: React.ReactNode}) {
  return <ul className={styles.subtree}>{props.children}</ul>;
}

export function ItemLayout(props: {
  attributes?: React.HTMLAttributes<HTMLLIElement> & {[key in `data-${string}`]?: string};
  Element?: React.ElementType;
  bullet: React.ReactNode;
  otherParents: React.ReactNode;
  editor: React.ReactNode;
}) {
  const Element_ = props.Element ?? ((props) => <li {...props} />);

  return (
    <Element_ {...props.attributes} className={`${styles.item} ${props.attributes?.className ?? ""}`}>
      <div style={{gridArea: "bullet"}}>{props.bullet}</div>
      <div style={{gridArea: "parents"}}>{props.otherParents}</div>
      <div style={{gridArea: "item"}}>{props.editor}</div>
    </Element_>
  );
}

export function Subtree({parent, onItemEvent}: {parent: A.Item; onItemEvent: (event: A.ItemEvent) => void}) {
  const children = parent.children.map((child) => <Item key={child.id} item={child} onItemEvent={onItemEvent} />);
  const openedLinks = parent.openedLinks.map((link) => (
    <Item key={link.id} item={link} onItemEvent={onItemEvent} />
  ));

  return (
    <SubtreeLayout>
      {openedLinks}
      {children}
      {parent.isPlaceholderShown && <PlaceholderItem onCreate={() => onItemEvent({type: "click-placeholder"})} />}
      <References linkedItem={parent} onItemEvent={onItemEvent} />
    </SubtreeLayout>
  );
}

export const Item = React.memo(
  function Item({item, onItemEvent}: {item: A.Item; onItemEvent: (event: A.ItemEvent) => void}) {
    const className = Misc.classes({
      [styles.item]: true,
      [styles.dropTarget]: item.dragState === "target",
      [styles.dragSource]: item.dragState === "source",
    });

    return (
      <li className={styles.itemContainer}>
        {/* data-id is used for drag and drop. */}
        <ItemLayout
          attributes={{
            ["data-drag-item-id"]: `${item.id}`,
            className,
          }}
          otherParents={
            <OtherParents
              otherParents={item.otherParents}
              click={(thing) => onItemEvent({type: "click-parent", thing, alt: false})}
              altClick={(thing) => onItemEvent({type: "click-parent", thing, alt: true})}
            />
          }
          bullet={
            <Bullet
              specialType={item.kind === "child" || item.kind === "root" ? undefined : item.kind}
              beginDrag={() => onItemEvent({type: "drag", id: item.id})}
              status={item.status}
              toggle={() => onItemEvent({type: "click-bullet", id: item.id, alt: false})}
              onMiddleClick={() => onItemEvent({type: "click-bullet", id: item.id, alt: true})}
            />
          }
          editor={
            <Editor.Editor
              editor={item.editor}
              hasFocus={item.hasFocus}
              onEvent={(event) => onItemEvent({type: "edit", id: item.id, event})}
            />
          }
        />
        {item.status === "expanded" && <Subtree parent={item} onItemEvent={onItemEvent} />}
      </li>
    );
  },
  (prev, next) => JSON.stringify(prev.item) === JSON.stringify(next.item) && prev.onItemEvent === next.onItemEvent,
);
