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
}

export type Destination = {parent: number /* Thing */; index: number};

export function fromRoot(state: Things, thing: number): Tree {
  return {
    next: 1,
    root: 0,
    nodes: {0: {thing, expanded: false, children: []}},
  };
}

export function thing(tree: Tree, id: number): number {
  return tree.nodes[id].thing;
}

export function expanded(tree: Tree, id: number): boolean {
  return tree.nodes[id].expanded;
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
  const expanded = !tree.nodes[id].expanded;

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
  const parent_ = parent(tree, id);
  const index = childIndex(tree, parent_, id);
  const newState = D.indent(state, thing(tree, parent_), index);

  let newTree: Tree = {...tree, nodes: {...tree.nodes, [parent_]: {...tree.nodes[parent_], children: [...tree.nodes[parent_].children]}}};
  newTree.nodes[parent_].children.splice(index, 1);

  const newParent = tree.nodes[parent_].children[index - 1];
  newTree = {...newTree, nodes: {...newTree.nodes, [newParent]: {...tree.nodes[newParent], children: [...tree.nodes[newParent].children]}}};
  newTree.nodes[newParent].children.push(id);

  newTree = expand(newState, newTree, newParent);

  return [newState, refresh(newTree, newState)];
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

export function copy(state: Things, tree: Tree, id: number, destination: Destination): [Things, Tree] {
  console.log("copy(%o, %o, %o, %o)", state, tree, id, destination);
  return [state, tree];
}

export function remove(state: Things, tree: Tree, id: number): [Things, Tree] {
  console.log("remove(%o, %o, %o)", state, tree, id);
  return [state, tree];
}

export function move(state: Things, tree: Tree, id: number, destination: Destination): [Things, Tree] {
  console.log("move(%o, %o, %o, %o)", state, tree, id, destination);
  return [state, tree];
}

export function moveUp(state: Things, tree: Tree, id: number): [Things, Tree] {
  console.log("moveUp(%o, %o, %o)", state, tree, id);
  return [state, tree];
}

export function moveDown(state: Things, tree: Tree, id: number): [Things, Tree] {
  console.log("moveDown(%o, %o, %o)", state, tree, id);
  return [state, tree];
}
