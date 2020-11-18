import * as Misc from "@johv/miscjs";
import * as D from "./data";
import * as I from "./tree-internal";

// The underlying data representation that is stored on the server is like a
// graph. It is defined in the Data module.
//
// However, we want to display the data on screen as a tree-like structure,
// except the "tree" can actually have the same item in multiple locations. This
// module defines such a "graph-as-a-tree" datastrcture and implements various
// operations on it.

export type NodeRef = I.NodeRef;
export type Tree = I.Tree;

export type Destination = {parent: NodeRef; index: number};

export function fromRoot(state: D.State, thing: string): Tree {
  // The UI considers otherParentsChildren(tree, {id: 0}) to be the list of
  // parents for the currently selected item, so we have to prepare the parents
  // here.

  // The underlying idea is good, but the specific implementation that we use is
  // a tad hacky.

  let result = I.fromRoot(thing);
  result = expand(state, result, {id: 0});
  result = toggleOtherParents(state, result, {id: 0});
  result = toggleBackreferences(state, result, {id: 0});
  return result;
}

export const root = I.root;
export const thing = I.thing;
export const expanded = I.expanded;
export const focused = I.focused;
export const hasFocus = I.hasFocus;
export const focus = I.focus;
export const unfocus = I.unfocus;
export const children = I.children;
export const backreferencesExpanded = I.backreferencesExpanded;
export const backreferencesChildren = I.backreferencesChildren;

function refEq(x: NodeRef, y: NodeRef): boolean {
  return x.id === y.id;
}

function parent(tree: Tree, child: NodeRef): NodeRef | undefined {
  for (const node of I.allNodes(tree)) {
    if (Misc.includesBy(children(tree, node), child, refEq)) return node;
  }
  return undefined;
}

function indexInParent(tree: Tree, node: NodeRef): number | undefined {
  const parent_ = parent(tree, node);
  if (parent_ === undefined) return undefined;
  return childIndex(tree, parent_, node);
}

function previousSibling(tree: Tree, node: NodeRef): NodeRef | null {
  const index = indexInParent(tree, node);
  if (index === undefined || index === 0) return null;
  return children(tree, parent(tree, node)!)[index - 1];
}

function nextSibling(tree: Tree, node: NodeRef): NodeRef | null {
  const index = indexInParent(tree, node);
  if (index === undefined || index === children(tree, parent(tree, node)!).length - 1) return null;
  return children(tree, parent(tree, node)!)[index + 1];
}

function previousVisibleItem(tree: Tree, node: NodeRef): NodeRef {
  const parent_ = parent(tree, node);
  if (parent_ === undefined) return node;

  if (indexInParent(tree, node) === 0) return parent_;

  let result = previousSibling(tree, node);
  if (result === null) throw "logic error";
  while (children(tree, result).length !== 0) {
    result = children(tree, result)[children(tree, result).length - 1];
  }
  return result;
}

function nextVisibleItem(tree: Tree, node: NodeRef): NodeRef {
  if (children(tree, node).length !== 0) return children(tree, node)[0];

  // Recursively traverse tree upwards until we hit a parent with a sibling
  let nparent = node;
  while (nparent !== tree.root) {
    const nextSibling_ = nextSibling(tree, nparent);
    if (nextSibling_ !== null) return nextSibling_;
    nparent = parent(tree, nparent)!; // Non-null because nparent !== tree.root
  }
  return nparent;
}

export function focusUp(tree: Tree): Tree {
  if (I.getFocus(tree) === null) throw "Cannot move focus because nothing is focused";
  return focus(tree, previousVisibleItem(tree, I.getFocus(tree)!));
}

export function focusDown(tree: Tree): Tree {
  if (I.getFocus(tree) === null) throw "Cannot move focus because nothing is focused";

  return focus(tree, nextVisibleItem(tree, I.getFocus(tree)!));
}

function genericRefreshChildren({
  getStateChildren,
  getTreeChildren,
  updateChildren,
}: {
  getStateChildren(state: D.State, thing: string): string[];
  getTreeChildren(tree: Tree, node: NodeRef): NodeRef[];
  updateChildren(tree: Tree, parent: NodeRef, update: (children: NodeRef[]) => NodeRef[]): Tree;
}): (state: D.State, tree: Tree, parent: NodeRef) => Tree {
  return (state: D.State, tree: Tree, parent: NodeRef) => {
    if (thing(tree, parent) === undefined) {
      console.warn("Node was not associated with item");
      return tree;
    }

    const stateChildren = getStateChildren(state, thing(tree, parent)!);
    const treeChildren = getTreeChildren(tree, parent).map((ch) => thing(tree, ch));

    if (!expanded(tree, parent)) return tree;
    if (Misc.arrayEq(stateChildren, treeChildren)) return tree;

    if (stateChildren.length === treeChildren.length + 1) {
      // Assume new child was inserted

      let result = tree;

      for (let i = 0; i < stateChildren.length; i++) {
        if (getTreeChildren(result, parent)[i] === undefined) {
          const [newChild, newResult] = load(state, result, stateChildren[i], parent);
          result = updateChildren(newResult, parent, (cs) => Misc.splice(cs, i, 0, newChild));
        } else {
          if (thing(result, getTreeChildren(result, parent)[i]) === stateChildren[i]) continue;
          const [newChild, newResult] = load(state, result, stateChildren[i], parent);
          result = updateChildren(newResult, parent, (cs) =>
            Misc.splice(cs, i, 0, newChild, getTreeChildren(result, parent)[i]),
          );
        }
      }

      // In case our assumption was wrong, truncate any extra elements that were inserted.
      result = updateChildren(result, parent, (cs) => Misc.splice(cs, stateChildren.length));

      return result;
    } else {
      // We can't make any assumptions; just recreate the entire children array

      // TODO: Clean up removed children.
      let result = updateChildren(tree, parent, (cs) => []);

      for (const childThing of stateChildren) {
        const [newChild, newResult] = load(state, result, childThing, parent);
        result = updateChildren(newResult, parent, (cs) => [...cs, newChild]);
      }

      return result;
    }
  };
}

function refreshChildren(state: D.State, tree: Tree, parent: NodeRef): Tree {
  if (thing(tree, parent) === undefined) {
    console.error("Node was not associated with item");
    return tree;
  }

  if (!expanded(tree, parent)) return tree;

  // [TODO] Check for equality and don't update if unnecessary. (See genericRefreshChildren.)
  // [TODO] Check if one new item was added and optimize updates. (See genericRefreshChildren.)
  // [TODO] Clean up removed children.

  let result = I.updateChildren(tree, parent, (cs) => []);

  for (const connection of D.childConnections(state, thing(tree, parent)!)) {
    const [newChild, newResult] = loadConnection(state, result, connection, parent);
    result = I.updateChildren(newResult, parent, (cs) => [...cs, newChild]);
  }

  return result;
}

export function expand(state: D.State, tree: Tree, node: NodeRef): Tree {
  if (!expanded(tree, node)) {
    return toggle(state, tree, node);
  } else {
    return tree;
  }
}

// Nodes without children (including backreferences and other parents) are always expanded.
function shouldAlwaysBeExpanded(state: D.State, tree: Tree, node: NodeRef): boolean {
  return !D.hasChildren(state, thing(tree, node)) && D.backreferences(state, thing(tree, node)).length === 0;
}

export function toggle(state: D.State, tree: Tree, node: NodeRef): Tree {
  if (shouldAlwaysBeExpanded(state, tree, node)) {
    // Items without children (including backreferences and other parents) are always expanded
    return I.markExpanded(tree, node, true);
  } else {
    let result = I.markExpanded(tree, node, !expanded(tree, node));
    if (children(tree, node).length === 0) {
      result = refreshChildren(state, result, node);
    }

    // This is only necessary because when there are 2 parents or fewer, we show
    // them as children, rather than nesting them inside their own item.
    result = refreshOtherParentsChildren(state, result, node);

    // We want references to be expanded by default if there are just few of
    // them.
    result = refreshBackreferencesChildren(state, result, node);
    if (backreferencesChildren(result, node).length <= 3 && !backreferencesExpanded(result, node)) {
      result = toggleBackreferences(state, result, node);
    }

    return result;
  }
}

export function loadConnection(
  state: D.State,
  tree: Tree,
  connection: D.Connection,
  parent?: NodeRef,
): [NodeRef, Tree] {
  const childThing = D.connectionChild(state, connection);

  if (childThing === undefined) {
    throw "Unable to load connection because connection did not reference a child.";
  }

  let [newNode, newTree] = I.loadThing(tree, childThing, connection);

  if (shouldAlwaysBeExpanded(state, newTree, newNode)) {
    newTree = I.markExpanded(newTree, newNode, true);
  }

  return [newNode, newTree];
}

export function load(state: D.State, tree: Tree, thing: string, parent?: NodeRef): [NodeRef, Tree] {
  const [newNode, newTree_] = I.loadThing(tree, thing);
  let newTree = newTree_;

  if (shouldAlwaysBeExpanded(state, newTree, newNode)) {
    newTree = I.markExpanded(newTree, newNode, true);
  }

  return [newNode, newTree];
}

// Refresh the nodes of a tree based on the state, such that relevant changes in
// the state are reflected in the tree.
export function refresh(tree: Tree, state: D.State): Tree {
  let result = tree;
  for (const node of I.allNodes(tree)) {
    // If it does not exist, it will be removed from its parents in refreshChildren.
    if (D.exists(state, thing(tree, node))) {
      result = refreshChildren(state, result, node);
      result = refreshBackreferencesChildren(state, result, node);
      result = refreshOtherParentsChildren(state, result, node);
    }
  }
  return result;
}

export function indent(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  if (refEq(root(tree), node)) return [state, tree];

  const oldParent = parent(tree, node);
  const index = indexInParent(tree, node);

  if (oldParent === undefined || index === undefined || index === 0) return [state, tree];

  const newParent = previousSibling(tree, node)!; // Non-null because index !== 0.

  return move(state, tree, node, {
    parent: newParent,
    index: D.children(state, thing(tree, newParent)).length,
  });
}

export function unindent(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined) return [state, tree];

  const grandparent = parent(tree, parent_);
  if (grandparent === undefined) return [state, tree];

  return move(state, tree, node, {parent: grandparent, index: childIndex(tree, grandparent, parent_) + 1});
}

function childIndex(tree: Tree, parent: NodeRef, child: NodeRef): number {
  const result = Misc.indexOfBy(children(tree, parent), child, refEq);
  if (result === undefined) throw "Parent does not contain child";
  return result;
}

// [TODO] The index in destination refers to a node, but elsewhere in this
// module we use it as though it refers to an index inside a thing. This is
// important when referring to an index inside a parent that has not been
// expanded in the tree yet.
export function move(state: D.State, tree: Tree, node: NodeRef, destination: Destination): [D.State, Tree] {
  const parent_ = parent(tree, node);

  if (parent_ === undefined) return [state, tree]; // Can't move root

  let newState = state;
  let newTree = tree;

  // Destination parent should be expanded for this operation to make sense.
  // Otherwise, we would be moving a node to somewhere that doesn't exist.
  if (!expanded(newTree, destination.parent)) {
    newTree = expand(newState, newTree, destination.parent);
  }

  newState = D.removeChild(newState, thing(tree, parent_), indexInParent(tree, node)!);
  const [newState_, newConnection] = D.insertChild(
    newState,
    thing(tree, destination.parent),
    thing(tree, node),
    destination.index,
  );
  newState = newState_;

  // Move nodes in tree

  for (const n of I.allNodes(newTree)) {
    // Remove old nodes

    // We want to find all nodes that represent the same thing as node inside
    // the same parent. Then, we want to remove those nodes from their parents.

    if (thing(newTree, n) === thing(tree, parent_)) {
      newTree = I.updateChildren(newTree, n, (ch) => Misc.splice(ch, indexInParent(tree, node)!, 1));
    }

    // Add new nodes
    if (thing(newTree, n) === thing(newTree, destination.parent)) {
      const [newNode, newTree_] = loadConnection(newState, newTree, newConnection, destination.parent);
      newTree = newTree_;
      newTree = I.updateChildren(newTree, n, (ch) => Misc.splice(ch, destination.index, 0, newNode));
    }
  }

  // Keep focus
  if (hasFocus(tree, node)) {
    newTree = focus(newTree, children(newTree, destination.parent)[destination.index]);
  }

  return [newState, newTree];
}

export function moveToAbove(
  state: D.State,
  tree: Tree,
  sourceNode: NodeRef,
  destinationNode: NodeRef,
): [D.State, Tree] {
  const parent_ = parent(tree, destinationNode);
  if (parent_ === undefined) return [state, tree];
  return move(state, tree, sourceNode, {parent: parent_, index: childIndex(tree, parent_, destinationNode)});
}

export function moveUp(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined || childIndex(tree, parent_, node) === 0) return [state, tree];
  return move(state, tree, node, {parent: parent_, index: childIndex(tree, parent_, node) - 1});
}

export function moveDown(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined || childIndex(tree, parent_, node) === children(tree, parent_).length - 1)
    return [state, tree];
  return move(state, tree, node, {parent: parent_, index: childIndex(tree, parent_, node) + 1});
}

export function copy(
  state: D.State,
  tree: Tree,
  node: NodeRef,
  destination: Destination,
): [D.State, Tree, NodeRef] {
  const [newState, newConnection] = D.insertChild(
    state,
    thing(tree, destination.parent),
    thing(tree, node),
    destination.index,
  );
  const newTree = refreshChildren(newState, tree, destination.parent);
  return [newState, newTree, children(newTree, destination.parent)[destination.index]];
}

export function copyToAbove(
  state: D.State,
  tree: Tree,
  sourceNode: NodeRef,
  destinationNode: NodeRef,
): [D.State, Tree, NodeRef] {
  const parent_ = parent(tree, destinationNode);
  if (parent_ === undefined) return [state, tree, sourceNode];
  return copy(state, tree, sourceNode, {parent: parent_, index: childIndex(tree, parent_, destinationNode)});
}

export function createSiblingBefore(
  state: D.State,
  tree: Tree,
  node: NodeRef,
): [D.State, Tree, string, NodeRef] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, node);
  if (parent_ === undefined) throw "Cannot create sibling before item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, node);

  const [newState2, newConnection] = D.insertChild(newState, parentThing, newThing, index);
  newState = newState2;

  const [newNode, newTree_] = loadConnection(newState, tree, newConnection, parent_);
  let newTree = newTree_;
  newTree = I.updateChildren(newTree, parent_, (children) => Misc.splice(children, index, 0, newNode));
  newTree = focus(newTree, newNode);

  // Also update other parents
  for (const n of I.allNodes(newTree)) {
    if (thing(newTree, n) === thing(tree, parent_) && !refEq(n, parent_)) {
      newTree = refreshChildren(newState, newTree, n);
    }
  }

  return [newState, newTree, newThing, newNode];
}

export function createSiblingAfter(
  state: D.State,
  tree: Tree,
  node: NodeRef,
): [D.State, Tree, string, NodeRef] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, node);
  if (parent_ === undefined) throw "Cannot create sibling after item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, node) + 1;

  const [newState2, newConnection] = D.insertChild(newState, parentThing, newThing, index);
  newState = newState2;

  const [newNode, newTree_] = loadConnection(newState, tree, newConnection, parent_);
  let newTree = newTree_;
  newTree = I.updateChildren(newTree, parent_, (children) => Misc.splice(children, index, 0, newNode));
  newTree = focus(newTree, newNode);

  // Also update other parents
  for (const n of I.allNodes(newTree)) {
    if (thing(newTree, n) === thing(tree, parent_) && !refEq(n, parent_)) {
      newTree = refreshChildren(newState, newTree, n);
    }
  }

  return [newState, newTree, newThing, newNode];
}

export function createChild(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree, string, NodeRef] {
  const [newState, childThing] = D.create(state);
  const [newState2, newTree2, newNode] = insertChild(newState, tree, node, childThing, 0);
  return [newState2, newTree2, childThing, newNode];
}

export function remove(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined) return [state, tree];

  const newState = D.removeChild(state, thing(tree, parent_), childIndex(tree, parent_, node));
  let newTree = focus(tree, previousVisibleItem(tree, node));

  // Remove nodes from tree to match state
  for (const n of I.allNodes(tree)) {
    if (thing(newTree, n) === thing(tree, parent_)) {
      newTree = I.updateChildren(newTree, n, (ch) => Misc.splice(ch, indexInParent(tree, node)!, 1));
    }
  }

  // Refresh list of other parents for all nodes representing the removed item
  for (const n of I.allNodes(newTree)) {
    if (thing(newTree, n) === thing(newTree, node)) {
      newTree = refreshOtherParentsChildren(newState, newTree, n);
    }
  }

  return [newState, newTree];
}

export function insertChild(
  state: D.State,
  tree: Tree,
  node: NodeRef,
  child: string,
  position: number,
): [D.State, Tree, NodeRef] {
  const [newState, newConnection] = D.insertChild(state, thing(tree, node), child, position);

  let newTree = expand(state, tree, node); // Expand parent now; we want to manually add the new node to the tree

  // Load node into the tree
  const [childNode, newTree_] = loadConnection(newState, newTree, newConnection, node);
  newTree = newTree_;
  newTree = I.updateChildren(newTree, node, (children) => Misc.splice(children, position, 0, childNode));
  newTree = focus(newTree, childNode);

  // Also refresh parents of this item elsewhere
  for (const n of I.allNodes(newTree)) {
    if (thing(newTree, n) === thing(tree, node) && !refEq(n, node)) {
      const [otherChildNode, newTree_] = loadConnection(newState, newTree, newConnection, n);
      newTree = newTree_;
      newTree = I.updateChildren(newTree, n, (children) => [...children, otherChildNode]);
    }
  }

  // Refresh list of other parents for all child items
  for (const n of I.allNodes(newTree)) {
    if (thing(newTree, n) === thing(newTree, childNode)) {
      newTree = refreshOtherParentsChildren(newState, newTree, n);
    }
  }

  return [newState, newTree, childNode];
}

export function insertSiblingAfter(
  state: D.State,
  tree: Tree,
  node: NodeRef,
  sibling: string,
): [D.State, Tree] {
  if (parent(tree, node) === undefined) return [state, tree];
  const result = insertChild(state, tree, parent(tree, node)!, sibling, indexInParent(tree, node)! + 1);
  return [result[0], result[1]];
}

export function insertParent(state: D.State, tree: Tree, node: NodeRef, parent: string): [D.State, Tree] {
  const newState = D.addChild(state, parent, thing(tree, node))[0];

  let newTree = tree;

  // Refresh parent list of these nodes
  for (const n of I.allNodes(newTree)) {
    if (thing(newTree, n) === thing(newTree, node)) {
      newTree = refreshOtherParentsChildren(newState, newTree, n);
    }
  }

  // Refresh children of this parent
  for (const n of I.allNodes(newTree)) {
    if (thing(newTree, n) === parent) {
      newTree = refreshChildren(newState, newTree, n);
    }
  }

  return [newState, newTree];
}

export function removeThing(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const newState = D.remove(state, thing(tree, node));
  let newTree = focus(tree, previousVisibleItem(tree, node));

  // Remove nodes from tree to match state
  for (const n of I.allNodes(tree)) {
    if (thing(newTree, n) === thing(tree, node)) {
      const p = parent(tree, n);
      if (p !== undefined) {
        newTree = I.updateChildren(newTree, p, (ch) => Misc.splice(ch, indexInParent(newTree, n)!, 1));
      }
    }
  }

  return [newState, newTree];
}

// Backreferences:

const refreshBackreferencesChildren = (state: D.State, tree: Tree, node: NodeRef) => {
  let result = genericRefreshChildren({
    getStateChildren: D.backreferences,
    getTreeChildren: I.backreferencesChildren,
    updateChildren: I.updateBackreferencesChildren,
  })(state, tree, node);

  for (const backreferenceNode of backreferencesChildren(result, node)) {
    // If a backreference contains just a link and nothing else, automatically
    // show its children.
    const content = D.content(state, thing(result, backreferenceNode));
    if (content.length === 1 && content[0].link !== undefined) {
      result = expand(state, result, backreferenceNode);
    }

    // We also need to update its other parents.
    //result = refreshOtherParentsChildren(state, result, backreferenceNode);
  }

  return result;
};

export function toggleBackreferences(state: D.State, tree: Tree, node: NodeRef): Tree {
  let result = I.markBackreferencesExpanded(tree, node, !backreferencesExpanded(tree, node));
  if (backreferencesExpanded(result, node)) {
    result = refreshBackreferencesChildren(state, result, node);
  }
  return result;
}

// Other parents:

function refreshOtherParentsChildren(state: D.State, tree: Tree, node: NodeRef): Tree {
  return genericRefreshChildren({
    getStateChildren: (state, thing_) => {
      const parent_ = parent(tree, node);
      return D.otherParents(state, thing_, parent_ && thing(tree, parent_));
    },
    getTreeChildren: I.otherParentsChildren,
    updateChildren: I.updateOtherParentsChildren,
  })(state, tree, node);
}

export const otherParentsExpanded = I.otherParentsExpanded;
export const otherParentsChildren = I.otherParentsChildren;

export function toggleOtherParents(state: D.State, tree: Tree, node: NodeRef): Tree {
  let result = I.markOtherParentsExpanded(tree, node, !otherParentsExpanded(tree, node));
  if (otherParentsExpanded(result, node)) {
    result = refreshOtherParentsChildren(state, result, node);
  }
  return result;
}

// Internal links:

// Internal links can be opened and closed in-line; opening a link creates a new
// child of the relevant item in the tree. A link refers to a thing (not a
// node), but the item that is created in the tree is a node. There is
// one-to-one relationships between linked things and nodes in the tree; that
// is, the same thing cannot be opened multiple times, even if a link occurs
// multiple times in the relevant item.

export function isLinkOpen(tree: Tree, node: NodeRef, link: string): boolean {
  return I.openedLinkNode(tree, node, link) !== undefined;
}

export function toggleLink(state: D.State, tree: Tree, node: NodeRef, link: string): Tree {
  if (isLinkOpen(tree, node, link)) {
    return I.setOpenedLinkNode(tree, node, link, null);
  } else {
    const [linkNode, result0] = load(state, tree, link);
    let result = I.setOpenedLinkNode(result0, node, link, linkNode);

    // Automatically expand parent item
    result = expand(state, result, node);

    // Automatically expand newly opened link
    result = toggle(state, result, linkNode);

    return result;
  }
}

export const openedLinksChildren = I.openedLinksChildren;
