import * as React from "react";

const style = require("./outline.module.scss").default;

import * as A from "../app";
import * as Item from "../item";
import * as E from "../editing";

import * as Editor from "./Editor";

export const Outline = React.memo(function ({
  outline,
  onItemEvent,
}: {
  outline: A.Outline;
  onItemEvent(event: Item.ItemEvent): void;
}) {
  return (
    <div className={style.outer}>
      <ParentsOutline parents={outline.parents} onItemEvent={onItemEvent} />
      <div className={style.inner}>
        <SelectedItem
          onEditEvent={(event) => onItemEvent({type: "edit", id: outline.root.id, event})}
          isFolded={outline.isFolded}
          unfold={() => onItemEvent({type: "unfold", id: outline.root.id})}
          editor={outline.root.editor}
          hasFocus={outline.root.hasFocus}
        />
        <div className={style.children}>
          <Item.Subtree parent={outline.root} onItemEvent={onItemEvent} />
        </div>
      </div>
      {outline.references.state !== "empty" && (
        <>
          <div className={style.references}>
            <h1 className={style.referencesheader}>References</h1>
            <ReferencesOutline references={outline.references} onItemEvent={onItemEvent} />
          </div>
        </>
      )}
    </div>
  );
});

const SelectedItem = React.memo(function SelectedItem(props: {
  editor: E.Editor;
  hasFocus: boolean;
  onEditEvent(event: Editor.Event): void;
  isFolded: boolean;
  unfold(): void;
}) {
  return (
    <div className={style.root}>
      <button className={style.unfold} onClick={props.unfold} disabled={!props.isFolded}>
        <span className="fas fa-fw fa-stream" />
      </button>
      <Editor.Editor editor={props.editor} hasFocus={props.hasFocus} onEvent={props.onEditEvent} />
    </div>
  );
});

function ReferencesOutline(props: {
  references: Item.ItemData["references"];
  onItemEvent: (event: Item.ItemEvent) => void;
}) {
  if (props.references.state === "empty" || props.references.state === "collapsed") return null;

  const referenceItems = props.references.items.map((item) => {
    return <Item.Item key={item.id} item={item} onItemEvent={props.onItemEvent} />;
  });

  return <ul className="subtree">{referenceItems}</ul>;
}

function ParentsOutline(props: {parents: Item.ItemData[]; onItemEvent: (event: Item.ItemEvent) => void}) {
  if (props.parents.length === 0) return null;

  const parentItems = props.parents.map((item) => (
    <Item.Item key={item.id} item={item} onItemEvent={props.onItemEvent} />
  ));

  return (
    <div className={style.parents}>
      <h1 className={style.referencesheader}>Parents</h1>
      <ul className="subtree">{parentItems}</ul>
    </div>
  );
}
