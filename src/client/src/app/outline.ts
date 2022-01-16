import * as Data from "../data";
import * as T from "../tree";
import * as A from "../app";
import * as Drag from "./drag";
import * as E from "../editor";
import * as I from "./item";

export type Outline = {
  root: I.Item;
  parents: I.Item[];
  references: I.Item["references"];
  isFolded: boolean;
};

export function fromApp(app: A.App): Outline {
  const rootDataItem = I.itemFromNode(app, T.root(app.tree));

  return {
    root: {...rootDataItem, references: {state: "empty"}},
    parents: T.otherParentsChildren(app.tree, T.root(app.tree)).map((n) => I.itemFromNode(app, n)),
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
