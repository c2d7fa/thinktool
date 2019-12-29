import {Things} from "./data";

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
  children: Node[];
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

export function toggle(tree: Tree, id: number): Tree {
  return {...tree, nodes: {...tree.nodes, [id]: {...tree.nodes[id], expanded: !tree.nodes[id].expanded}}};
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
