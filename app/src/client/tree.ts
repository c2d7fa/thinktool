import {Things} from "./data";
import * as D from "./data";

// The underlying data representation that is stored on the server is like a
// graph. It is defined in the Data module.
//
// However, we want to display the data on screen as a tree-like structure,
// except the "tree" can actually have the same item in multiple locations. This
// module defines such a "graph-as-a-tree" datastrcture and implements various
// operations on it.

export interface Node {
  thing: string;
  expanded: boolean;
  children: number[];
  backreferences: {expanded: boolean; children: number[]};
}

export interface Tree {
  next: number; // Next ID to be created
  root: number;
  nodes: {[id: number]: Node};
  focus: null | number;
}

export type Destination = {parent: number /* Thing */; index: number};

export function fromRoot(state: Things, thing: string): Tree {
  return {
    next: 1,
    root: 0,
    nodes: {0: {thing, expanded: false, children: [], backreferences: {expanded: false, children: []}}},
    focus: null,
  };
}

export function thing(tree: Tree, id: number): string {
  return tree.nodes[id].thing;
}

export function expanded(tree: Tree, id: number): boolean {
  return tree.nodes[id].expanded;
}

export function hasFocus(tree: Tree, id: number): boolean {
  return tree.focus === id;
}

export function focus(tree: Tree, id: number): Tree {
  return {...tree, focus: id};
}

export function unfocus(tree: Tree): Tree {
  return {...tree, focus: null};
}

function indexInParent(tree: Tree, id: number): number | undefined {
  const parent_ = parent(tree, id);
  if (parent_ === undefined)
    return undefined;
  return childIndex(tree, parent_, id);
}

function previousSibling(tree: Tree, id: number): number | null {
  const index = indexInParent(tree, id);
  if (index === undefined || index === 0)
    return null;
  return children(tree, parent(tree, id)!)[index - 1];
}

function nextSibling(tree: Tree, id: number): number | null {
  const index = indexInParent(tree, id);
  if (index === undefined || index === children(tree, parent(tree, id)!).length - 1)
    return null;
  return children(tree, parent(tree, id)!)[index + 1];
}

function previousVisibleItem(tree: Tree, id: number): number {
  const parent_ = parent(tree, id);
  if (parent_ === undefined)
    return id;

  if (indexInParent(tree, id) === 0)
    return parent_;

  let result = previousSibling(tree, id);
  if (result === null) throw "logic error";
  while (children(tree, result).length !== 0) {
    result = children(tree, result)[children(tree, result).length - 1];
  }
  return result;
}

function nextVisibleItem(tree: Tree, id: number): number {
  if (children(tree, id).length !== 0)
    return children(tree, id)[0];

  // Recursively traverse tree upwards until we hit a parent with a sibling
  let nparent = id;
  while (nparent !== tree.root) {
    const nextSibling_ = nextSibling(tree, nparent);
    if (nextSibling_ !== null)
      return nextSibling_;
    nparent = parent(tree, nparent)!;  // Non-null because nparent !== tree.root
  }
  return nparent;
}

export function focusUp(tree: Tree): Tree {
  if (tree.focus === null)
    throw "Cannot move focus because nothing is focused";
  return {...tree, focus: previousVisibleItem(tree, tree.focus)};
}

export function focusDown(tree: Tree): Tree {
  if (tree.focus === null)
    throw "Cannot move focus because nothing is focused";

  return {...tree, focus: nextVisibleItem(tree, tree.focus)};
}

function refreshChildren(state: Things, tree: Tree, parent: number): Tree {
  function arrayEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (a[i] !== b[i])
        return false;
    return true;
  }

  const stateChildren = D.children(state, thing(tree, parent));
  const treeChildren = children(tree, parent).map(ch => thing(tree, ch));

  if (!expanded(tree, parent))
    return tree;
  if (arrayEqual(stateChildren, treeChildren))
    return tree;

  if (stateChildren.length === treeChildren.length + 1) {
    // Assume new child was inserted

    // Copy children so we can mutate it for convencience
    let result: Tree = {...tree, nodes: {...tree.nodes, [parent]: {...tree.nodes[parent], children: [...tree.nodes[parent].children]}}};

    for (let i = 0; i < stateChildren.length; i++) {
      if (children(result, parent)[i] === undefined) {
        const [newChild, newResult] = load(state, result, stateChildren[i]);
        result = newResult;
        result.nodes[parent].children.splice(i, 0, newChild);
      } else {
        if (thing(result, children(result, parent)[i]) === stateChildren[i])
          continue;
        const [newChild, newResult] = load(state, result, stateChildren[i]);
        result = newResult;
        result.nodes[parent].children.splice(i, 0, newChild, children(result, parent)[i]);
      }
    }

    // In case our assumption was wrong, truncate any extra elements that were inserted.
    result.nodes[parent].children.splice(stateChildren.length);

    return result;
  } else {
    // We can't make any assumptions; just recreate the entire children array

    // TODO: Clean up removed children.
    let result: Tree = {...tree, nodes: {...tree.nodes, [parent]: {...tree.nodes[parent], children: []}}};

    for (const childThing of stateChildren) {
      const [newChild, newResult] = load(state, result, childThing);
      result = newResult;
      result.nodes[parent].children = [...result.nodes[parent].children, newChild];
    }

    return result;
  }
}

export function expand(state: Things, tree: Tree, id: number): Tree {
  if (!expanded(tree, id))
    return toggle(state, tree, id);
  else
    return tree;
}

export function toggle(state: Things, tree: Tree, id: number): Tree {
  let expanded = !tree.nodes[id].expanded;

  if (!D.hasChildren(state, thing(tree, id))) {
    // Items without children are always expanded
    expanded = true;
  }

  // Update expanded status
  let result = {...tree, nodes: {...tree.nodes, [id]: {...tree.nodes[id], expanded}}};

  // Load children from state if necessary
  if (result.nodes[id].children.length === 0)
    result = refreshChildren(state, result, id);

  return result;
}

export function load(state: Things, tree: Tree, thing: string): [number, Tree] {
  const id = tree.next;

  // Update next ID
  let result = {...tree, next: tree.next + 1};

  // Add node
  result = {
    ...result,
    nodes: {
      ...result.nodes,
      [id]: {
        thing,
        expanded: false,
        children: [],
        backreferences: {
          expanded: false,
          children: [],
        },
      },
    },
  };

  // If the child has no children, it should be expanded by default
  if (!D.hasChildren(state, thing))
    result.nodes[id].expanded = true;

  return [id, result];
}

export function children(tree: Tree, parent: number): number[] {
  return tree.nodes[parent].children;
}

// Refresh the nodes of a tree based on the state, such that relevant changes in
// the state are reflected in the tree.
export function refresh(tree: Tree, state: Things): Tree {
  let result = tree;
  for (const id in tree.nodes) {
    if (D.exists(state, thing(tree, +id)))
      result = refreshChildren(state, result, +id);
    // Otherwise, it will be removed from its parents in refreshChildren.
  }
  return result;
}

export function indent(state: Things, tree: Tree, id: number): [Things, Tree] {
  if (tree.root === id)
    return [state, tree];

  const parent_ = parent(tree, id);
  const index = indexInParent(tree, id);

  if (parent_ === undefined || index === undefined || index === 0)
    return [state, tree];

  const newState = D.indent(state, thing(tree, parent_), index);

  // TODO: A lot of this logic is similar to Data.indent, but I'm not sure if we
  // can express one in terms of the other.

  let newTree: Tree = {...tree, nodes: {...tree.nodes, [parent_]: {...tree.nodes[parent_], children: [...tree.nodes[parent_].children]}}};
  newTree.nodes[parent_].children.splice(index, 1);

  const newParent = tree.nodes[parent_].children[index - 1];
  newTree = {...newTree, nodes: {...newTree.nodes, [newParent]: {...tree.nodes[newParent], children: [...tree.nodes[newParent].children]}}};
  newTree.nodes[newParent].children.push(id);

  newTree = expand(newState, newTree, newParent);

  return [newState, refresh(newTree, newState)];
}

export function unindent(state: Things, tree: Tree, id: number): [Things, Tree] {
  const parent_ = parent(tree, id);
  if (parent_ === undefined)
    return [state, tree];

  const grandparent = parent(tree, parent_);
  if (grandparent === undefined)
    return [state, tree];

  return move(state, tree, id, {parent: grandparent, index: childIndex(tree, grandparent, parent_) + 1});
}

function parent(tree: Tree, child: number): number | undefined {
  for (const parent in tree.nodes)
    if (children(tree, +parent).includes(child))
      return +parent;
  return undefined;
}

function childIndex(tree: Tree, parent: number, child: number): number {
  return children(tree, parent).indexOf(child);
}

export function move(state: Things, tree: Tree, id: number, destination: Destination): [Things, Tree] {
  const parent_ = parent(tree, id);

  if (parent_ === undefined)
    return [state, tree]; // Can't move root

  let newState = D.removeChild(state, thing(tree, parent_), indexInParent(tree, id)!);
  newState = D.insertChild(newState, thing(tree, destination.parent), thing(tree, id), destination.index);

  let newTree = refresh(tree, newState);  // TODO: Could be improved

  // Keep focus
  if (tree.focus === id)
    newTree = {...newTree, focus: children(newTree, destination.parent)[destination.index]};

  return [newState, newTree];
}

export function moveToAbove(state: Things, tree: Tree, sourceId: number, destinationId: number): [Things, Tree] {
  const parent_ = parent(tree, destinationId);
  if (parent_ === undefined)
    return [state, tree];
  return move(state, tree, sourceId, {parent: parent_, index: childIndex(tree, parent_, destinationId)});
}

export function moveUp(state: Things, tree: Tree, id: number): [Things, Tree] {
  const parent_ = parent(tree, id);
  if (parent_ === undefined || childIndex(tree, parent_, id) === 0)
    return [state, tree];
  return move(state, tree, id, {parent: parent_, index: childIndex(tree, parent_, id) - 1});
}

export function moveDown(state: Things, tree: Tree, id: number): [Things, Tree] {
  const parent_ = parent(tree, id);
  if (parent_ === undefined || childIndex(tree, parent_, id) === children(tree, parent_).length - 1)
    return [state, tree];
  return move(state, tree, id, {parent: parent_, index: childIndex(tree, parent_, id) + 1});
}

export function copy(state: Things, tree: Tree, id: number, destination: Destination): [Things, Tree, number] {
  const newState = D.insertChild(state, thing(tree, destination.parent), thing(tree, id), destination.index);
  const newTree = refreshChildren(newState, tree, destination.parent);
  return [newState, newTree, children(newTree, destination.parent)[destination.index]];
}

export function copyToAbove(state: Things, tree: Tree, sourceId: number, destinationId: number): [Things, Tree, number] {
  const parent_ = parent(tree, destinationId);
  if (parent_ === undefined)
    return [state, tree, sourceId];
  return copy(state, tree, sourceId, {parent: parent_, index: childIndex(tree, parent_, destinationId)});
}

export function createSiblingBefore(state: Things, tree: Tree, id: number): [Things, Tree, string, number] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, id);
  if (parent_ === undefined)
    throw "Cannot create sibling before item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, id);

  newState = D.insertChild(newState, parentThing, newThing, index);

  let newTree = tree;
  const [newId, newTree_] = load(newState, tree, newThing);
  newTree = newTree_;
  newTree = {...newTree, nodes: {...newTree.nodes, [parent_]: {...newTree.nodes[parent_], children: [...newTree.nodes[parent_].children]}}};
  newTree.nodes[parent_].children.splice(index, 0, newId);

  newTree = refresh(newTree, newState);

  return [newState, newTree, newThing, newId];
}


export function createSiblingAfter(state: Things, tree: Tree, id: number): [Things, Tree, string, number] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, id);
  if (parent_ === undefined)
    throw "Cannot create sibling after item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, id) + 1;

  newState = D.insertChild(newState, parentThing, newThing, index);

  let newTree = tree;
  const [newId, newTree_] = load(newState, tree, newThing);
  newTree = newTree_;
  newTree = {...newTree, nodes: {...newTree.nodes, [parent_]: {...newTree.nodes[parent_], children: [...newTree.nodes[parent_].children]}}};
  newTree.nodes[parent_].children.splice(index, 0, newId);

  newTree = refresh(newTree, newState);

  return [newState, newTree, newThing, newId];
}

export function createChild(state: Things, tree: Tree, id: number): [Things, Tree, string, number] {
  // Create item as child
  const [state1, childThing] = D.create(state);
  const state2 = D.addChild(state1, thing(tree, id), childThing);

  // Load it into the tree
  const tree1 = expand(state, tree, id);
  const [childId, tree2] = load(state2, tree1, childThing);
  const tree3 = {...tree2, nodes: {...tree2.nodes, [id]: {...tree2.nodes[id], children: [...tree2.nodes[id].children, childId]}}};
  const tree4 = focus(tree3, childId);

  return [state2, tree4, childThing, childId];
}

export function remove(state: Things, tree: Tree, id: number): [Things, Tree] {
  const parent_ = parent(tree, id);
  if (parent_ === undefined)
    return [state, tree];

  const newState = D.removeChild(state, thing(tree, parent_), childIndex(tree, parent_, id));
  const newTree = focus(tree, previousVisibleItem(tree, id));

  return [newState, refresh(newTree, newState)];
}

export function backreferencesExpanded(tree: Tree, id: number): boolean {
  return tree.nodes[id].backreferences.expanded;
}

// TODO: Massive code duplication between this and 'refreshChildren'
function refreshBackreferencesChildren(state: Things, tree: Tree, parent: number): Tree {
  function arrayEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (a[i] !== b[i])
        return false;
    return true;
  }

  const stateChildren = D.backreferences(state, thing(tree, parent));
  const treeChildren = tree.nodes[parent].backreferences.children.map(ch => thing(tree, ch));

  if (!expanded(tree, parent))
    return tree;
  if (arrayEqual(stateChildren, treeChildren))
    return tree;

  if (stateChildren.length === treeChildren.length + 1) {
    // Assume new child was inserted

    // Copy children so we can mutate it for convencience
    let result: Tree = {...tree, nodes: {...tree.nodes, [parent]: {...tree.nodes[parent], backreferences: {...tree.nodes[parent].backreferences, children: [...tree.nodes[parent].backreferences.children]}}}};

    for (let i = 0; i < stateChildren.length; i++) {
      if (result.nodes[parent].backreferences.children[i] === undefined) {
        const [newChild, newResult] = load(state, result, stateChildren[i]);
        result = newResult;
        result.nodes[parent].backreferences.children.splice(i, 0, newChild);
      } else {
        if (thing(result, result.nodes[parent].backreferences.children[i]) === stateChildren[i])
          continue;
        const [newChild, newResult] = load(state, result, stateChildren[i]);
        result = newResult;
        result.nodes[parent].backreferences.children.splice(i, 0, newChild, result.nodes[parent].backreferences.children[i]);
      }
    }

    // In case our assumption was wrong, truncate any extra elements that were inserted.
    result.nodes[parent].backreferences.children.splice(stateChildren.length);

    return result;
  } else {
    // We can't make any assumptions; just recreate the entire children array

    // TODO: Clean up removed children.
    let result: Tree = {...tree, nodes: {...tree.nodes, [parent]: {...tree.nodes[parent], backreferences: {...tree.nodes[parent].backreferences, children: []}}}};

    for (const childThing of stateChildren) {
      const [newChild, newResult] = load(state, result, childThing);
      result = newResult;
      result.nodes[parent].backreferences.children = [...result.nodes[parent].backreferences.children, newChild];
    }

    return result;
  }
}

export function toggleBackreferences(state: Things, tree: Tree, id: number): Tree {
  const expanded = !tree.nodes[id].backreferences.expanded;

  let result = {...tree, nodes: {...tree.nodes, [id]: {...tree.nodes[id], backreferences: {...tree.nodes[id].backreferences, expanded}}}};

  // Load children if necessary
  if (expanded) {
    result = refreshBackreferencesChildren(state, result, id);
  }

  return result;
}

export function backreferencesChildren(tree: Tree, id: number): number[] {
  return tree.nodes[id].backreferences.children;
}
