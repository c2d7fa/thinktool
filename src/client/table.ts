import * as D from "./data";
import * as T from "./tree";

export function columns(state: D.State, tree: T.Tree, parent: T.NodeRef): string[] {
  let result: string[] = [];

  for (const child of T.children(tree, parent)) {
    for (const grandchild of T.children(tree, child)) {
      if (T.tag(state, tree, grandchild) !== null && !result.includes(T.tag(state, tree, grandchild)!)) {
        result.push(T.tag(state, tree, grandchild)!);
      }
    }
  }

  return result;
}

export function cell(state: D.State, tree: T.Tree, row: T.NodeRef, column: string): T.NodeRef[] {
  return T.children(tree, row).filter(
    (ch) => T.tag(state, tree, ch) !== null && T.tag(state, tree, ch) === column,
  );
}

// [TODO] Hack. If we didn't call this when entering table view, the children
// would not be available, and thus we would have to wait for the user to
// expand each node before the columns would be populated.
//
// Even with this, updates are not sent to a node that is not expanded, so its
// columns are not updated.
export function prepareTreeForTableView(state: D.State, tree: T.Tree): T.Tree {
  let result = tree;

  for (const node of T.children(tree, T.root(tree))) {
    if (!T.expanded(result, node)) {
      result = T.toggle(state, result, node);
      result = T.toggle(state, result, node);
    }
  }

  return result;
}
