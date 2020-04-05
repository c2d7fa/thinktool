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
