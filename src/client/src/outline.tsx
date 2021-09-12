import * as React from "react";

import * as Data from "./data";
import * as T from "./tree";
import * as A from "./app";
import * as Drag from "./drag";
import * as Item from "./item";

import * as Editor from "./ui/Editor";
import * as SelectedItem from "./ui/SelectedItem";
import * as PlaceholderItem from "./ui/PlaceholderItem";

type Outline = {root: Item.ItemData; rootParents: Item.ItemData[]; isRootFolded: boolean};

export function fromApp(app: A.App): Outline {
  function dataItemizeNode(app: A.App, node: T.NodeRef, parent?: T.NodeRef): Item.ItemData {
    const otherParents = Data.otherParents(
      app.state,
      T.thing(app.tree, node),
      parent && T.thing(app.tree, parent),
    ).map((id) => ({id, text: Data.contentText(app.state, id)}));

    const backreferences = Data.backreferences(app.state, T.thing(app.tree, node));

    const editor = Editor.forNode(app, node);

    return {
      id: node.id,
      kind: Item.kind(app.tree, node),
      dragState: Drag.node(app.drag, node),
      hasFocus: editor.hasFocus,
      status: Item.status(app.tree, node),
      editor: editor.editor,
      otherParents: otherParents,
      openedLinks: T.openedLinksChildren(app.tree, node).map((n) => dataItemizeNode(app, n, node)),
      isPlaceholderShown: PlaceholderItem.isVisible(app) && T.root(app.tree).id === node.id,
      children: T.children(app.tree, node).map((n) => dataItemizeNode(app, n, node)),
      references:
        backreferences.length === 0
          ? {state: "empty"}
          : !T.backreferencesExpanded(app.tree, node)
          ? {state: "collapsed", count: backreferences.length}
          : {
              state: "expanded",
              count: backreferences.length,
              items: T.backreferencesChildren(app.tree, node).map((n) => dataItemizeNode(app, n)),
            },
    };
  }

  return {
    root: dataItemizeNode(app, T.root(app.tree)),
    rootParents: T.otherParentsChildren(app.tree, T.root(app.tree)).map((n) => dataItemizeNode(app, n)),
    isRootFolded: SelectedItem.isFolded(app),
  };
}

export const Outline = React.memo(function ({
  outline,
  onItemEvent,
}: {
  outline: Outline;
  onItemEvent(event: Item.ItemEvent): void;
}) {
  return (
    <div className="overview">
      <ParentsOutline parents={outline.rootParents} onItemEvent={onItemEvent} />
      <div className="overview-main">
        <SelectedItem.SelectedItem
          onEditEvent={(event) => onItemEvent({type: "edit", id: outline.root.id, event})}
          isFolded={outline.isRootFolded}
          unfold={() => onItemEvent({type: "unfold", id: outline.root.id})}
          editor={outline.root.editor}
          hasFocus={outline.root.hasFocus}
        />
        <div className="children">
          <Item.Subtree parent={outline.root} onItemEvent={onItemEvent} />
        </div>
      </div>
      {outline.root.references.state !== "empty" && (
        <>
          <div className="references">
            <h1 className="link-section">References</h1>
            <ReferencesOutline references={outline.root.references} onItemEvent={onItemEvent} />
          </div>
        </>
      )}
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
    <div className="parents">
      <h1 className="link-section">Parents</h1>
      <ul className="subtree">{parentItems}</ul>
    </div>
  );
}
