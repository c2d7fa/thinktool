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

export function toggle(state: Things, tree: Tree, id: number): Tree {
  const expanded = !tree.nodes[id].expanded;

  // Update expanded status
  let result = {...tree, nodes: {...tree.nodes, [id]: {...tree.nodes[id], expanded}}};

  // Load children from state if necessary
  //
  // TODO: This won't work if state changes! In fact, I'm not sure how to handle
  // that in general.
  if (expanded && result.nodes[id].children.length === 0) {
    for (const childThing of D.children(state, thing(tree, id))) {
      const [newChild, newResult] = load(state, result, childThing);
      result = newResult;
      result.nodes[id].children = [...result.nodes[id].children, newChild];
    }
  }

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
