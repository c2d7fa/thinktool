import * as React from "react";

const style = require("./outline.module.scss").default;

import * as A from "../app";
import * as E from "../editor";

import * as Item from "./item";
import {Editor} from "./editor";
import {Icon} from "./icons";

export const Outline = React.memo(function ({outline, send}: {outline: A.Outline; send: A.Send}) {
  return (
    <div className={style.outer}>
      <ParentsOutline parents={outline.parents} send={send} />
      <div className={style.inner}>
        <SelectedItem
          onEditEvent={(event) => send({id: outline.root.id, ...event})}
          isFolded={outline.isFolded}
          unfold={() => send({type: "unfold"})}
          editor={outline.root.editor}
          hasFocus={outline.root.hasFocus}
        />
        <div className={style.children}>
          <Item.Subtree parent={outline.root} send={send} />
        </div>
      </div>
      {outline.references.state !== "empty" && (
        <>
          <div className={style.references}>
            <h1 className={style.sectionHeader}>References</h1>
            <ReferencesOutline references={outline.references} send={send} />
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

function ReferencesOutline(props: {references: A.Item["references"]; send: A.Send}) {
  if (props.references.state === "empty" || props.references.state === "collapsed") return null;

  const referenceItems = props.references.items.map((item) => {
    return <Item.Item key={item.id} item={item} send={props.send} />;
  });

  return <Item.SubtreeLayout>{referenceItems}</Item.SubtreeLayout>;
}

function ParentsOutline(props: {parents: A.Item[]; send: A.Send}) {
  if (props.parents.length === 0) return null;

  const parentItems = props.parents.map((item) => <Item.Item key={item.id} item={item} send={props.send} />);

  return (
    <div className={style.parents}>
      <h1 className={style.sectionHeader}>Parents</h1>
      <Item.SubtreeLayout>{parentItems}</Item.SubtreeLayout>
    </div>
  );
}
