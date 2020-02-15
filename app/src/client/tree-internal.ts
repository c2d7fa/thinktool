export interface Node {
  thing: string;
  expanded: boolean;
  children: NodeRef[];
  backreferences: {expanded: boolean; children: NodeRef[]};
}

export type NodeRef = {id: number};

export interface Tree {
  nextId: number;
  root: NodeRef;
  nodes: {[id: number]: Node};
  focus: null | NodeRef;
}

function getNode(tree: Tree, node: NodeRef): Node {
  return tree.nodes[node.id];
}

function updateNode(tree: Tree, node: NodeRef, update: (node: Node) => Node): Tree {
  return {...tree, nodes: {...tree.nodes, [node.id]: update(getNode(tree, node))}};
}

export function fromRoot(thing: string): Tree {
  return {
    nextId: 1,
    root: {id: 0},
    nodes: {0: {thing, expanded: false, children: [], backreferences: {expanded: false, children: []}}},
    focus: null,
  };
}

export function root(tree: Tree): NodeRef {
  return tree.root;
}

export function thing(tree: Tree, node: NodeRef): string {
  return getNode(tree, node).thing;
}

export function expanded(tree: Tree, node: NodeRef): boolean {
  return getNode(tree, node).expanded;
}

export function hasFocus(tree: Tree, node: NodeRef): boolean {
  return tree.focus?.id === node.id;
}

export function getFocus(tree: Tree): NodeRef | null {
  return tree.focus;
}

export function focus(tree: Tree, node: NodeRef): Tree {
  return {...tree, focus: node};
}

export function unfocus(tree: Tree): Tree {
  return {...tree, focus: null};
}

export function markExpanded(tree: Tree, node: NodeRef, expanded: boolean): Tree {
  return updateNode(tree, node, n => ({...n, expanded}));
}

export function children(tree: Tree, node: NodeRef): NodeRef[] {
  return tree.nodes[node.id].children;
}

export function loadThing(tree: Tree, thing: string): [NodeRef, Tree] {
  return [{id: tree.nextId}, {...tree, nextId: tree.nextId + 1, nodes: {...tree.nodes, [tree.nextId]: {thing, expanded: false, children: [], backreferences: {expanded: false, children: []}}}}];
}

export function* allNodes(tree: Tree): Generator<NodeRef> {
  for (const id in tree.nodes) {
    yield {id: +id};
  }
}

export function updateChildren(tree: Tree, node: NodeRef, update: (children: NodeRef[]) => NodeRef[]): Tree {
  return updateNode(tree, node, n => ({...n, children: update(n.children)}));
}

export function backreferencesExpanded(tree: Tree, node: NodeRef): boolean {
  return tree.nodes[node.id].backreferences.expanded;
}

export function backreferencesChildren(tree: Tree, node: NodeRef): NodeRef[] {
  return tree.nodes[node.id].backreferences.children;
}

export function markBackreferencesExpanded(tree: Tree, node: NodeRef, expanded: boolean): Tree {
  return updateNode(tree, node, n => ({...n, backreferences: {...n.backreferences, expanded}}));
}

export function updateBackreferencesChildren(tree: Tree, node: NodeRef, update: (children: NodeRef[]) => NodeRef[]): Tree {
  return updateNode(tree, node, n => ({...n, backreferences: {...n.backreferences, children: update(n.backreferences.children)}}));
}

