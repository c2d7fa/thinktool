import {Things} from "./data";
import * as D from "./data";

// To represent the entire state of the application, we need two modules.
//
// The 'data' module keeps track of the actual data itself, such as what the
// things are, what qualities they have and how they connect together.
//
// The 'tree' module more closely represents what the user actually sees on the
// screen. We usually want to show related nodes in a tree structure, and the
// 'tree' module can describe this structure with support for folding, moving
// nodes, etc.

export interface Node {
  thing: number;
  expanded: boolean;
  children: number[];
}

export interface Tree {
  next: number; // Next ID to be created
  root: number;
  nodes: {[id: number]: Node};
  focus: null | number;
}

export type Destination = {parent: number /* Thing */; index: number};

export function fromRoot(state: Things, thing: number): Tree {
  return {
    next: 1,
    root: 0,
    nodes: {0: {thing, expanded: false, children: []}},
    focus: null,
  };
}

export function thing(tree: Tree, id: number): number {
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

function previousSibling(tree: Tree, id: number): number {
  return children(tree, parent(tree, id))[childIndex(tree, parent(tree, id), id) - 1];
}

function nextSibling(tree: Tree, id: number): number {
  if (childIndex(tree, parent(tree, id), id) === children(tree, parent(tree, id)).length - 1)
    return null;
  return children(tree, parent(tree, id))[childIndex(tree, parent(tree, id), id) + 1];
}

function previousVisibleItem(tree: Tree, id: number): number {
  if (parent(tree, id) === undefined)
    return id;

  if (childIndex(tree, parent(tree, id), id) === 0)
    return parent(tree, id);

  let result = previousSibling(tree, id);
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
    if (nextSibling(tree, nparent) !== null)
      return nextSibling(tree, nparent);
    nparent = parent(tree, nparent);
  }
  return nparent;
}

export function focusUp(tree: Tree): Tree {
  return {...tree, focus: previousVisibleItem(tree, tree.focus)};
}

export function focusDown(tree: Tree): Tree {
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

    for (const childThing of D.children(state, thing(tree, parent))) {
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

export function load(state: Things, tree: Tree, thing: number): [number, Tree] {
  const id = tree.next;

  // Update next ID
  let result = {...tree, next: tree.next + 1};

  // Add node
  result = {...result, nodes: {...result.nodes, [id]: {thing, expanded: false, children: []}}};

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
  for (const id in tree.nodes)
    result = refreshChildren(state, result, +id);
  return result;
}

export function indent(state: Things, tree: Tree, id: number): [Things, Tree] {
  if (tree.root === id)
    return [state, tree];

  const parent_ = parent(tree, id);
  const index = childIndex(tree, parent_, id);

  if (index === 0)
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

function parent(tree: Tree, child: number): number {
  for (const parent in tree.nodes)
    if (children(tree, +parent).includes(child))
      return +parent;
  return undefined;
}

function childIndex(tree: Tree, parent: number, child: number): number {
  return children(tree, parent).indexOf(child);
}

export function move(state: Things, tree: Tree, id: number, destination: Destination): [Things, Tree] {
  let newState = D.removeChild(state, thing(tree, parent(tree, id)), childIndex(tree, parent(tree, id), id));
  newState = D.insertChild(newState, thing(tree, destination.parent), thing(tree, id), destination.index);

  let newTree = refresh(tree, newState);  // TODO: Could be improved

  // Keep focus
  if (tree.focus === id)
    newTree = {...newTree, focus: children(newTree, destination.parent)[destination.index]};

  return [newState, newTree];
}

export function createSiblingAfter(state: Things, tree: Tree, id: number): [Things, Tree, number, number] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = thing(tree, parent(tree, id));
  const index = childIndex(tree, parent(tree, id), id) + 1;

  newState = D.insertChild(newState, parent_, newThing, index);

  let newTree = tree;
  const [newId, newTree_] = load(newState, tree, newThing);
  newTree = newTree_;
  newTree = {...newTree, nodes: {...newTree.nodes, [parent(tree, id)]: {...newTree.nodes[parent(tree, id)], children: [...newTree.nodes[parent(tree, id)].children]}}};
  newTree.nodes[parent(tree, id)].children.splice(index, 0, newId);

  newTree = refresh(newTree, newState);

  return [newState, newTree, newThing, newId];
}

export function remove(state: Things, tree: Tree, id: number): [Things, Tree] {
  if (parent(tree, id) === undefined)
    return [state, tree];

  const newState = D.removeChild(state, thing(tree, parent(tree, id)), childIndex(tree, parent(tree, id), id));
  const newTree = focus(tree, previousVisibleItem(tree, id));

  return [newState, refresh(newTree, newState)];
}
