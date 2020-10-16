import * as T from "./tree";

export type NodeStatus = "expanded" | "collapsed" | "terminal";

export function nodeStatus(tree: T.Tree, node: T.NodeRef): NodeStatus {
  if (!T.expanded(tree, node)) {
    return "collapsed";
  } else if (
    T.children(tree, node).length === 0 &&
    T.otherParentsChildren(tree, node).length === 0 &&
    T.backreferencesChildren(tree, node).length === 0 &&
    T.openedLinksChildren(tree, node).length === 0
  ) {
    return "terminal";
  } else {
    return "expanded";
  }
}
