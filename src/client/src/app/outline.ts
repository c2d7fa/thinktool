import * as Data from "../data";
import * as T from "../tree";
import * as A from "../app";
import * as Drag from "../drag";
import * as Editor from "../ui/Editor";
import * as PlaceholderItem from "../ui/PlaceholderItem";
import * as I from "./item";

export type Outline = {
  root: I.Item;
  parents: I.Item[];
  references: I.Item["references"];
  isFolded: boolean;
};

export function fromApp(app: A.App): Outline {
  function dataItemizeNode(app: A.App, node: T.NodeRef, parent?: T.NodeRef): I.Item {
    const otherParents = Data.otherParents(
      app.state,
      T.thing(app.tree, node),
      parent && T.thing(app.tree, parent),
    ).map((id) => ({id, text: Data.contentText(app.state, id)}));

    const backreferences = Data.backreferences(app.state, T.thing(app.tree, node));

    const editor = Editor.forNode(app, node);

    return {
      id: node.id,
      kind: I.kind(app.tree, node),
      dragState: Drag.node(app.drag, node),
      hasFocus: editor.hasFocus,
      status: I.status(app.tree, node),
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

  const rootDataItem = dataItemizeNode(app, T.root(app.tree));

  return {
    root: {...rootDataItem, references: {state: "empty"}},
    parents: T.otherParentsChildren(app.tree, T.root(app.tree)).map((n) => dataItemizeNode(app, n)),
    isFolded: isFolded(app),
    references: rootDataItem.references,
  };
}

function isFolded(app: A.App) {
  let isFolded = false;
  for (const child of T.children(app.tree, T.root(app.tree))) {
    if (!T.expanded(app.tree, child)) {
      isFolded = true;
      break;
    }
  }
  return isFolded;
}
