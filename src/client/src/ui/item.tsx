import * as React from "react";
import * as Misc from "@johv/miscjs";

import * as A from "../app";

import Bullet from "./Bullet";

import * as Editor from "./editor";
import {OtherParents} from "./OtherParents";
import {PlaceholderItem} from "./PlaceholderItem";

const styles = require("./item.module.scss").default;

function References({linkedItem, send}: {linkedItem: A.Item; send: A.Send}) {
  if (linkedItem.references.state === "empty") return null;

  const text = `${linkedItem.references.count} reference${linkedItem.references.count === 1 ? "" : "s"}${
    linkedItem.references.state === "collapsed" ? "..." : ""
  }`;

  const items =
    linkedItem.references.state !== "expanded"
      ? null
      : linkedItem.references.items.map((reference) => <Item key={reference.id} item={reference} send={send} />);

  return (
    <>
      <li>
        <div>
          <button
            onClick={() => send({type: "toggle-references", id: linkedItem.id})}
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
  attributes?: React.HTMLAttributes<HTMLDivElement> & {[key in `data-${string}`]?: string};
  bullet: React.ReactNode;
  otherParents: React.ReactNode;
  editor: React.ReactNode;
}) {
  return (
    <div {...props.attributes} className={`${styles.item} ${props.attributes?.className ?? ""}`}>
      <div style={{gridArea: "bullet"}}>{props.bullet}</div>
      <div style={{gridArea: "parents"}}>{props.otherParents}</div>
      <div style={{gridArea: "item"}}>{props.editor}</div>
    </div>
  );
}

export function Subtree({parent, send}: {parent: A.Item; send: A.Send}) {
  const children = parent.children.map((child) => <Item key={child.id} item={child} send={send} />);
  const openedLinks = parent.openedLinks.map((link) => <Item key={link.id} item={link} send={send} />);

  return (
    <SubtreeLayout>
      {openedLinks}
      {children}
      {parent.isPlaceholderShown && <PlaceholderItem onCreate={() => send({type: "click-placeholder"})} />}
      <References linkedItem={parent} send={send} />
    </SubtreeLayout>
  );
}

export const Item = React.memo(
  function Item({item, send}: {item: A.Item; send: A.Send}) {
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
              click={(thing) => send({type: "click-parent", thing, alt: false})}
              altClick={(thing) => send({type: "click-parent", thing, alt: true})}
            />
          }
          bullet={
            <Bullet
              specialType={item.kind === "child" || item.kind === "root" ? undefined : item.kind}
              beginDrag={() => send({type: "startDrag", id: item.id})}
              status={item.status}
              toggle={() => send({type: "click-bullet", id: item.id, alt: false})}
              onMiddleClick={() => send({type: "click-bullet", id: item.id, alt: true})}
            />
          }
          editor={
            <Editor.Editor
              editor={item.editor}
              hasFocus={item.hasFocus}
              onEvent={(event) => send({id: item.id, ...event})}
            />
          }
        />
        {item.status === "expanded" && <Subtree parent={item} send={send} />}
      </li>
    );
  },
  (prev, next) => JSON.stringify(prev.item) === JSON.stringify(next.item) && prev.send === next.send,
);
