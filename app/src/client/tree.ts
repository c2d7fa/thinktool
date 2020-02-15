import * as G from "../general";
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

export function fromRoot(state: D.Things, thing: string): Tree {
  return I.fromRoot(thing);
}

export const root = I.root;
export const thing = I.thing;
export const expanded = I.expanded;
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
    getStateChildren(state: D.Things, thing: string): string[];
    getTreeChildren(tree: Tree, node: NodeRef): NodeRef[];
    updateChildren(tree: Tree, parent: NodeRef, update: (children: NodeRef[]) => NodeRef[]): Tree;
  }): (state: D.Things, tree: Tree, parent: NodeRef) => Tree
{
  return (state: D.Things, tree: Tree, parent: NodeRef) => {
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
          const [newChild, newResult] = load(state, result, stateChildren[i]);
          result = updateChildren(newResult, parent, cs => G.splice(cs, i, 0, newChild));
        } else {
          if (thing(result, getTreeChildren(result, parent)[i]) === stateChildren[i])
            continue;
          const [newChild, newResult] = load(state, result, stateChildren[i]);
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
        const [newChild, newResult] = load(state, result, childThing);
        result = updateChildren(newResult, parent, cs => [...cs, newChild]);
      }

      return result;
    }
  };
}

const refreshChildren = genericRefreshChildren({getStateChildren: D.children, getTreeChildren: children, updateChildren: I.updateChildren});

export function expand(state: D.Things, tree: Tree, node: NodeRef): Tree {
  if (!expanded(tree, node)) {
    return toggle(state, tree, node);
  } else {
    return tree;
  }
}

export function toggle(state: D.Things, tree: Tree, node: NodeRef): Tree {
  if (!D.hasChildren(state, thing(tree, node)) && D.backreferences(state, thing(tree, node)).length === 0) {
    // Items without children (including backreferences) are always expanded
    return I.markExpanded(tree, node, true);
  } else {
    let result = I.markExpanded(tree, node, !expanded(tree, node));
    if (children(tree, node).length === 0) {
      result = refreshChildren(state, result, node);
    }
    return result;
  }
}

export function load(state: D.Things, tree: Tree, thing: string): [NodeRef, Tree] {
  let [newNode, newTree] = I.loadThing(tree, thing);

  // If the child has no children (including backreferences), it should be expanded by default
  if (!D.hasChildren(state, thing) && D.backreferences(state, thing).length === 0)
    newTree = I.markExpanded(newTree, newNode, true);

  return [newNode, newTree];
}

// Refresh the nodes of a tree based on the state, such that relevant changes in
// the state are reflected in the tree.
export function refresh(tree: Tree, state: D.Things): Tree {
  let result = tree;
  for (const node of I.allNodes(tree)) {
    if (D.exists(state, thing(tree, node))) { // Otherwise, it will be removed from its parents in refreshChildren.
      result = refreshChildren(state, result, node);
      result = refreshBackreferencesChildren(state, result, node);
    }
  }
  return result;
}

export function indent(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree] {
  if (refEq(root(tree), node))
    return [state, tree];

  const oldParent = parent(tree, node);
  const index = indexInParent(tree, node);

  if (oldParent === undefined || index === undefined || index === 0)
    return [state, tree];

  const newState = D.indent(state, thing(tree, oldParent), index);

  let newTree = I.updateChildren(tree, oldParent, children => G.splice(children, index, 1));

  const newParent = children(newTree, oldParent)[index - 1];
  newTree = I.updateChildren(newTree, newParent, children => [...children, node]);
  newTree = expand(newState, newTree, newParent);

  return [newState, refresh(newTree, newState)];
}

export function unindent(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree] {
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

export function move(state: D.Things, tree: Tree, node: NodeRef, destination: Destination): [D.Things, Tree] {
  const parent_ = parent(tree, node);

  if (parent_ === undefined)
    return [state, tree]; // Can't move root

  let newState = D.removeChild(state, thing(tree, parent_), indexInParent(tree, node)!);
  newState = D.insertChild(newState, thing(tree, destination.parent), thing(tree, node), destination.index);

  let newTree = refresh(tree, newState);  // TODO: Could be improved

  // Keep focus
  if (hasFocus(tree, node)) {
    newTree = focus(tree, children(newTree, destination.parent)[destination.index]);
  }

  return [newState, newTree];
}

export function moveToAbove(state: D.Things, tree: Tree, sourceNode: NodeRef, destinationNode: NodeRef): [D.Things, Tree] {
  const parent_ = parent(tree, destinationNode);
  if (parent_ === undefined)
    return [state, tree];
  return move(state, tree, sourceNode, {parent: parent_, index: childIndex(tree, parent_, destinationNode)});
}

export function moveUp(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined || childIndex(tree, parent_, node) === 0)
    return [state, tree];
  return move(state, tree, node, {parent: parent_, index: childIndex(tree, parent_, node) - 1});
}

export function moveDown(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined || childIndex(tree, parent_, node) === children(tree, parent_).length - 1)
    return [state, tree];
  return move(state, tree, node, {parent: parent_, index: childIndex(tree, parent_, node) + 1});
}

export function copy(state: D.Things, tree: Tree, node: NodeRef, destination: Destination): [D.Things, Tree, NodeRef] {
  const newState = D.insertChild(state, thing(tree, destination.parent), thing(tree, node), destination.index);
  const newTree = refreshChildren(newState, tree, destination.parent);
  return [newState, newTree, children(newTree, destination.parent)[destination.index]];
}

export function copyToAbove(state: D.Things, tree: Tree, sourceNode: NodeRef, destinationNode: NodeRef): [D.Things, Tree, NodeRef] {
  const parent_ = parent(tree, destinationNode);
  if (parent_ === undefined)
    return [state, tree, sourceNode];
  return copy(state, tree, sourceNode, {parent: parent_, index: childIndex(tree, parent_, destinationNode)});
}

export function createSiblingBefore(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree, string, NodeRef] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    throw "Cannot create sibling before item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, node);

  newState = D.insertChild(newState, parentThing, newThing, index);

  let [newId, newTree] = load(newState, tree, newThing);

  newTree = I.updateChildren(newTree, parent_, children => G.splice(children, index, 0, newId));
  newTree = refresh(newTree, newState);

  return [newState, newTree, newThing, newId];
}

export function createSiblingAfter(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree, string, NodeRef] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    throw "Cannot create sibling after item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, node) + 1;

  newState = D.insertChild(newState, parentThing, newThing, index);

  let [newNode, newTree] = load(newState, tree, newThing);
  newTree = I.updateChildren(newTree, parent_, children => G.splice(children, index, 0, newNode));
  newTree = refresh(newTree, newState);

  return [newState, newTree, newThing, newNode];
}

export function createChild(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree, string, NodeRef] {
  // Create item as child
  const [state1, childThing] = D.create(state);
  const state2 = D.addChild(state1, thing(tree, node), childThing);

  // Load it into the tree
  const tree1 = expand(state, tree, node);
  const [childNode, tree2] = load(state2, tree1, childThing);
  const tree3 = I.updateChildren(tree2, node, children => [...children, childNode]);
  const tree4 = focus(tree3, childNode);

  return [state2, tree4, childThing, childNode];
}

export function remove(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    return [state, tree];

  const newState = D.removeChild(state, thing(tree, parent_), childIndex(tree, parent_, node));
  const newTree = focus(tree, previousVisibleItem(tree, node));

  return [newState, refresh(newTree, newState)];
}

// Backreferences:

const refreshBackreferencesChildren = genericRefreshChildren({getStateChildren: D.backreferences, getTreeChildren: I.backreferencesChildren, updateChildren: I.updateBackreferencesChildren});

export function toggleBackreferences(state: D.Things, tree: Tree, node: NodeRef): Tree {
  let result = I.markBackreferencesExpanded(tree, node, !backreferencesExpanded(tree, node));
  if (backreferencesExpanded(result, node)) {
    result = refreshBackreferencesChildren(state, result, node);
  }
  return result;
}

export function insertChild(state: D.Things, tree: Tree, node: NodeRef, child: string, position: number): [D.Things, Tree] {
  const newState = D.insertChild(state, thing(tree, node), child, position);
  return [newState, refresh(tree, newState)];
}

export function removeThing(state: D.Things, tree: Tree, node: NodeRef): [D.Things, Tree] {
  const newState = D.remove(state, thing(tree, node));
  return [newState, refresh(tree, newState)];
}
