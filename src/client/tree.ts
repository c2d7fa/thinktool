import * as G from "../shared/general";
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
  for (const node of I.allNodes(tree))
    if (G.includesBy(children(tree, node), child, refEq))
      return node;
  return undefined;
}

function indexInParent(tree: Tree, node: NodeRef): number | undefined {
  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    return undefined;
  return childIndex(tree, parent_, node);
}

function previousSibling(tree: Tree, node: NodeRef): NodeRef | null {
  const index = indexInParent(tree, node);
  if (index === undefined || index === 0)
    return null;
  return children(tree, parent(tree, node)!)[index - 1];
}

function nextSibling(tree: Tree, node: NodeRef): NodeRef | null {
  const index = indexInParent(tree, node);
  if (index === undefined || index === children(tree, parent(tree, node)!).length - 1)
    return null;
  return children(tree, parent(tree, node)!)[index + 1];
}

function previousVisibleItem(tree: Tree, node: NodeRef): NodeRef {
  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    return node;

  if (indexInParent(tree, node) === 0)
    return parent_;

  let result = previousSibling(tree, node);
  if (result === null) throw "logic error";
  while (children(tree, result).length !== 0) {
    result = children(tree, result)[children(tree, result).length - 1];
  }
  return result;
}

function nextVisibleItem(tree: Tree, node: NodeRef): NodeRef {
  if (children(tree, node).length !== 0)
    return children(tree, node)[0];

  // Recursively traverse tree upwards until we hit a parent with a sibling
  let nparent = node;
  while (nparent !== tree.root) {
    const nextSibling_ = nextSibling(tree, nparent);
    if (nextSibling_ !== null)
      return nextSibling_;
    nparent = parent(tree, nparent)!;  // Non-null because nparent !== tree.root
  }
  return nparent;
}

export function focusUp(tree: Tree): Tree {
  if (I.getFocus(tree) === null)
    throw "Cannot move focus because nothing is focused";
  return focus(tree, previousVisibleItem(tree, I.getFocus(tree)!));
}

export function focusDown(tree: Tree): Tree {
  if (I.getFocus(tree) === null)
    throw "Cannot move focus because nothing is focused";

  return focus(tree, nextVisibleItem(tree, I.getFocus(tree)!));
}

function genericRefreshChildren(
  {getStateChildren, getTreeChildren, updateChildren}: {
    getStateChildren(state: D.State, thing: string): string[];
    getTreeChildren(tree: Tree, node: NodeRef): NodeRef[];
    updateChildren(tree: Tree, parent: NodeRef, update: (children: NodeRef[]) => NodeRef[]): Tree;
  }): (state: D.State, tree: Tree, parent: NodeRef) => Tree
{
  return (state: D.State, tree: Tree, parent: NodeRef) => {
    const stateChildren = getStateChildren(state, thing(tree, parent));
    const treeChildren = getTreeChildren(tree, parent).map(ch => thing(tree, ch));

    if (!expanded(tree, parent))
      return tree;
    if (G.arrayEq(stateChildren, treeChildren))
      return tree;

    if (stateChildren.length === treeChildren.length + 1) {
      // Assume new child was inserted

      let result = tree;

      for (let i = 0; i < stateChildren.length; i++) {
        if (getTreeChildren(result, parent)[i] === undefined) {
          const [newChild, newResult] = load(state, result, stateChildren[i], parent);
          result = updateChildren(newResult, parent, cs => G.splice(cs, i, 0, newChild));
        } else {
          if (thing(result, getTreeChildren(result, parent)[i]) === stateChildren[i])
            continue;
          const [newChild, newResult] = load(state, result, stateChildren[i], parent);
          result = updateChildren(newResult, parent, cs => G.splice(cs, i, 0, newChild, getTreeChildren(result, parent)[i]));
        }
      }

      // In case our assumption was wrong, truncate any extra elements that were inserted.
      result = updateChildren(result, parent, cs => G.splice(cs, stateChildren.length));

      return result;
    } else {
      // We can't make any assumptions; just recreate the entire children array

      // TODO: Clean up removed children.
      let result = updateChildren(tree, parent, cs => []);

      for (const childThing of stateChildren) {
        const [newChild, newResult] = load(state, result, childThing, parent);
        result = updateChildren(newResult, parent, cs => [...cs, newChild]);
      }

      return result;
    }
  };
}

const refreshChildren = genericRefreshChildren({getStateChildren: D.children, getTreeChildren: children, updateChildren: I.updateChildren});

export function expand(state: D.State, tree: Tree, node: NodeRef): Tree {
  if (!expanded(tree, node)) {
    return toggle(state, tree, node);
  } else {
    return tree;
  }
}

function hasOtherParents(state: D.State, tree: Tree, node: NodeRef, wrtParent?: NodeRef): boolean {
  if (wrtParent === undefined) {
    const parent_ = parent(tree, node);
    if (parent_ === undefined) return false;
    return D.otherParents(state, thing(tree, node), thing(tree, parent_)).length !== 0;
  } else {
    return D.otherParents(state, thing(tree, node), thing(tree, wrtParent)).length !== 0;
  }
}

export function toggle(state: D.State, tree: Tree, node: NodeRef): Tree {
  if (!D.hasChildren(state, thing(tree, node)) && D.backreferences(state, thing(tree, node)).length === 0 && !hasOtherParents(state, tree, node)) {
    // Items without children (including backreferences and other parents) are always expanded
    return I.markExpanded(tree, node, true);
  } else {
    let result = I.markExpanded(tree, node, !expanded(tree, node));
    if (children(tree, node).length === 0) {
      result = refreshChildren(state, result, node);
    }
    return result;
  }
}

export function load(state: D.State, tree: Tree, thing: string, parent?: NodeRef): [NodeRef, Tree] {
  const [newNode, newTree_] = I.loadThing(tree, thing);
  let newTree = newTree_;

  // If the child has no children (including backreferences and other parents), it should be expanded by default
  if (!D.hasChildren(state, thing) && D.backreferences(state, thing).length === 0 && !hasOtherParents(state, newTree, newNode, parent)) {
    newTree = I.markExpanded(newTree, newNode, true);
  }

  return [newNode, newTree];
}

// Refresh the nodes of a tree based on the state, such that relevant changes in
// the state are reflected in the tree.
export function refresh(tree: Tree, state: D.State): Tree {
  let result = tree;
  for (const node of I.allNodes(tree)) {
    if (D.exists(state, thing(tree, node))) { // Otherwise, it will be removed from its parents in refreshChildren.
      result = refreshChildren(state, result, node);
      result = refreshBackreferencesChildren(state, result, node);
      result = refreshOtherParentsChildren(state, result, node);
    }
  }
  return result;
}

export function indent(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  if (refEq(root(tree), node))
    return [state, tree];

  const oldParent = parent(tree, node);
  const index = indexInParent(tree, node);

  if (oldParent === undefined || index === undefined || index === 0)
    return [state, tree];

  const newParent = previousSibling(tree, node);

  return move(state, tree, node, {parent: newParent, index: D.children(state, thing(tree, newParent)).length})
}

export function unindent(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    return [state, tree];

  const grandparent = parent(tree, parent_);
  if (grandparent === undefined)
    return [state, tree];

  return move(state, tree, node, {parent: grandparent, index: childIndex(tree, grandparent, parent_) + 1});
}

function childIndex(tree: Tree, parent: NodeRef, child: NodeRef): number {
  const result = G.indexOfBy(children(tree, parent), child, refEq);
  if (result === undefined) throw "Parent does not contain child";
  return result;
}

// [TODO] The index in destination refers to a node, but elsewhere in this
// module we use it as though it refers to an index inside a thing. This is
// important when referring to an index inside a parent that has not been
// expanded in the tree yet.
export function move(state: D.State, tree: Tree, node: NodeRef, destination: Destination): [D.State, Tree] {
  const parent_ = parent(tree, node);

  if (parent_ === undefined)
    return [state, tree]; // Can't move root

  let newState = state;
  let newTree = tree;

  // Destination parent should be expanded for this operation to make sense.
  // Otherwise, we would be moving a node to somewhere that doesn't exist.
  if (!expanded(newTree, destination.parent)) {
    newTree = expand(newState, newTree, destination.parent);
  }

  newState = D.removeChild(newState, thing(tree, parent_), indexInParent(tree, node)!);
  newState = D.insertChild(newState, thing(tree, destination.parent), thing(tree, node), destination.index);

  // Move nodes in tree

  for (const n of I.allNodes(newTree)) {
    // Remove old nodes

    // We want to find all nodes that represent the same thing as node inside
    // the same parent. Then, we want to remove those nodes from their parents.

    if (thing(newTree, n) === thing(tree, parent_)) {
      newTree = I.updateChildren(newTree, n, ch => G.splice(ch, indexInParent(tree, node), 1));
    }

    // Add new nodes
    if (thing(newTree, n) === thing(newTree, destination.parent)) {
        const [newNode, newTree_] = load(state, newTree, thing(newTree, node), destination.parent);
        newTree = newTree_
        newTree = I.updateChildren(newTree, n, ch => G.splice(ch, destination.index, 0, newNode));
    }
  }

  // Keep focus
  if (hasFocus(tree, node)) {
    newTree = focus(newTree, children(newTree, destination.parent)[destination.index]);
  }

  return [newState, newTree];
}

export function moveToAbove(state: D.State, tree: Tree, sourceNode: NodeRef, destinationNode: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, destinationNode);
  if (parent_ === undefined)
    return [state, tree];
  return move(state, tree, sourceNode, {parent: parent_, index: childIndex(tree, parent_, destinationNode)});
}

export function moveUp(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined || childIndex(tree, parent_, node) === 0)
    return [state, tree];
  return move(state, tree, node, {parent: parent_, index: childIndex(tree, parent_, node) - 1});
}

export function moveDown(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined || childIndex(tree, parent_, node) === children(tree, parent_).length - 1)
    return [state, tree];
  return move(state, tree, node, {parent: parent_, index: childIndex(tree, parent_, node) + 1});
}

export function copy(state: D.State, tree: Tree, node: NodeRef, destination: Destination): [D.State, Tree, NodeRef] {
  const newState = D.insertChild(state, thing(tree, destination.parent), thing(tree, node), destination.index);
  const newTree = refreshChildren(newState, tree, destination.parent);
  return [newState, newTree, children(newTree, destination.parent)[destination.index]];
}

export function copyToAbove(state: D.State, tree: Tree, sourceNode: NodeRef, destinationNode: NodeRef): [D.State, Tree, NodeRef] {
  const parent_ = parent(tree, destinationNode);
  if (parent_ === undefined)
    return [state, tree, sourceNode];
  return copy(state, tree, sourceNode, {parent: parent_, index: childIndex(tree, parent_, destinationNode)});
}

export function createSiblingBefore(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree, string, NodeRef] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    throw "Cannot create sibling before item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, node);

  newState = D.insertChild(newState, parentThing, newThing, index);

  const [newId, newTree_] = load(newState, tree, newThing, parent_);
  let newTree = newTree_;

  newTree = I.updateChildren(newTree, parent_, children => G.splice(children, index, 0, newId));
  newTree = refresh(newTree, newState);

  return [newState, newTree, newThing, newId];
}

export function createSiblingAfter(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree, string, NodeRef] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    throw "Cannot create sibling after item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, node) + 1;

  newState = D.insertChild(newState, parentThing, newThing, index);

  const [newNode, newTree_] = load(newState, tree, newThing, parent_);
  let newTree = newTree_;
  newTree = I.updateChildren(newTree, parent_, children => G.splice(children, index, 0, newNode));
  newTree = refreshChildren(newState, newTree, parent_);

  return [newState, newTree, newThing, newNode];
}

export function createChild(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree, string, NodeRef] {
  // Create item as child
  const [state1, childThing] = D.create(state);
  const state2 = D.addChild(state1, thing(tree, node), childThing);

  // Load it into the tree
  const tree1 = expand(state, tree, node);
  const [childNode, tree2] = load(state2, tree1, childThing, node);
  const tree3 = I.updateChildren(tree2, node, children => [...children, childNode]);
  const tree4 = focus(tree3, childNode);

  return [state2, tree4, childThing, childNode];
}

export function remove(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    return [state, tree];

  const newState = D.removeChild(state, thing(tree, parent_), childIndex(tree, parent_, node));
  let newTree = focus(tree, previousVisibleItem(tree, node));

  // Remove nodes from tree to match state
  for (const n of I.allNodes(tree)) {
    if (thing(newTree, n) === thing(tree, parent_)) {
      newTree = I.updateChildren(newTree, n, ch => G.splice(ch, indexInParent(tree, node), 1));
    }
  }

  return [newState, newTree];
}

export function insertChild(state: D.State, tree: Tree, node: NodeRef, child: string, position: number): [D.State, Tree] {
  const newState = D.insertChild(state, thing(tree, node), child, position);
  return [newState, refresh(tree, newState)];
}

export function removeThing(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const newState = D.remove(state, thing(tree, node));

  // Remove nodes from tree to match state
  let newTree = tree;
  for (const n of I.allNodes(tree)) {
    if (thing(newTree, n) === thing(tree, node)) {
      const p = parent(newTree, n);
      newTree = I.updateChildren(newTree, p, ch => G.splice(ch, indexInParent(newTree, n), 1));
    }
  }

  return [newState, newTree];
}

export function clone(state: D.State, tree: Tree, node: NodeRef): [D.State, Tree] {
  const [newState, newTree, _] = copyToAbove(state, tree, node, node);
  const newTree2 = focus(newTree, node);
  return [newState, newTree2];
}

// Backreferences:

const refreshBackreferencesChildren = genericRefreshChildren({getStateChildren: D.backreferences, getTreeChildren: I.backreferencesChildren, updateChildren: I.updateBackreferencesChildren});

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
    const result = I.setOpenedLinkNode(result0, node, link, linkNode);
    return result;
  }
}

export const openedLinksChildren = I.openedLinksChildren;
