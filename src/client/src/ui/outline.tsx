import * as React from "react";

const style = require("./outline.module.scss").default;

import * as A from "../app";
import * as E from "../editor";

import * as Item from "./item";
import {Editor} from "./editor";
import {Icon} from "./icons";

export const Outline = React.memo(function ({
  outline,
  onItemEvent,
}: {
  outline: A.Outline;
  onItemEvent(event: A.ItemEvent): void;
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
            <h1 className={style.sectionHeader}>References</h1>
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
  onEditEvent(event: E.Event): void;
  isFolded: boolean;
  unfold(): void;
}) {
  return (
    <div className={style.root}>
      <button className={style.unfold} onClick={props.unfold} disabled={!props.isFolded}>
        <Icon icon="unfold" />
      </button>
      <Editor editor={props.editor} hasFocus={props.hasFocus} onEvent={props.onEditEvent} />
    </div>
  );
});

function ReferencesOutline(props: {references: A.Item["references"]; onItemEvent: (event: A.ItemEvent) => void}) {
  if (props.references.state === "empty" || props.references.state === "collapsed") return null;

  const referenceItems = props.references.items.map((item) => {
    return <Item.Item key={item.id} item={item} onItemEvent={props.onItemEvent} />;
  });

  return <Item.SubtreeLayout>{referenceItems}</Item.SubtreeLayout>;
}

function ParentsOutline(props: {parents: A.Item[]; onItemEvent: (event: A.ItemEvent) => void}) {
  if (props.parents.length === 0) return null;

  const parentItems = props.parents.map((item) => (
    <Item.Item key={item.id} item={item} onItemEvent={props.onItemEvent} />
  ));

  return (
    <div className={style.parents}>
      <h1 className={style.sectionHeader}>Parents</h1>
      <Item.SubtreeLayout>{parentItems}</Item.SubtreeLayout>
    </div>
  );
}
