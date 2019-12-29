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

export interface Tree {
  id: number;
  thing: number;
  expanded: boolean;
  children: Tree[];
}

export type Destination = {parent: number /* Thing */; index: number};

export function toggle(state: Things, tree: Tree, id: number): Tree {
  console.log("toggle(%o, %o, %o)", state, tree, id);
  return tree;
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
