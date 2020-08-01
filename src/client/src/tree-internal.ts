import * as Misc from "@johv/miscjs";
import * as D from "./data";

export interface Node {
  thing: string;
  connection?: D.Connection; // undefined for root item (and other non-applicable items)
  expanded: boolean;
  children: NodeRef[];
  backreferences: {expanded: boolean; children: NodeRef[]};
  otherParents: {expanded: boolean; children: NodeRef[]};
  openedLinks: {[thing: string]: NodeRef | undefined};
}

export type NodeRef = {id: number};

export interface Tree {
  nextId: number;
  root: NodeRef;
  nodes: {[id: number]: Node | undefined};
  focus: null | NodeRef;
}

function getNode(tree: Tree, node: NodeRef): Node | undefined {
  return tree.nodes[node.id];
}

function updateNode(tree: Tree, node: NodeRef, update: (node: Node) => Node): Tree {
  const data = getNode(tree, node);
  if (data === undefined) {
    console.warn("Couldn't update node %o, because it didn't exist in %o", node, tree);
    return tree;
  }

  return {...tree, nodes: {...tree.nodes, [node.id]: update(data)}};
}

export function fromRoot(thing: string): Tree {
  return {
    nextId: 1,
    root: {id: 0},
    nodes: {
      0: {
        thing,
        expanded: false,
        children: [],
        backreferences: {expanded: false, children: []},
        otherParents: {expanded: false, children: []},
        openedLinks: {},
      },
    },
    focus: null,
  };
}

export function root(tree: Tree): NodeRef {
  return tree.root;
}

export function thing(tree: Tree, node: NodeRef): string {
  const thing = getNode(tree, node)?.thing;
  if (thing === undefined) {
    alert("A fatal error occurred. Please check the developer console for more information.");
    throw {message: "Could not get item for node", node, tree};
  }
  return thing;
}

export function expanded(tree: Tree, node: NodeRef): boolean {
  if (getNode(tree, node) === undefined)
    console.warn("Assuming non-existent node %o in %o is not expanded", node, tree);
  return getNode(tree, node)?.expanded ?? false;
}

export function focused(tree: Tree): NodeRef | null {
  return tree.focus;
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
  return updateNode(tree, node, (n) => ({...n, expanded}));
}

export function children(tree: Tree, node: NodeRef): NodeRef[] {
  if (getNode(tree, node) === undefined)
    console.warn("Could not get children of non-existent node %o in %o", node, tree);
  return getNode(tree, node)?.children ?? [];
}

export function loadThing(tree: Tree, thing: string, connection?: D.Connection): [NodeRef, Tree] {
  return [
    {id: tree.nextId},
    {
      ...tree,
      nextId: tree.nextId + 1,
      nodes: {
        ...tree.nodes,
        [tree.nextId]: {
          thing,
          connection,
          expanded: false,
          children: [],
          backreferences: {expanded: false, children: []},
          otherParents: {expanded: false, children: []},
          openedLinks: {},
        },
      },
    },
  ];
}

export function* allNodes(tree: Tree): Generator<NodeRef> {
  for (const id in tree.nodes) {
    yield {id: +id};
  }
}

export function updateChildren(tree: Tree, node: NodeRef, update: (children: NodeRef[]) => NodeRef[]): Tree {
  return updateNode(tree, node, (n) => ({...n, children: update(n.children)}));
}

export function connection(tree: Tree, node: NodeRef): D.Connection | undefined {
  return tree.nodes[node.id]?.connection;
}

// Backreferences

export function backreferencesExpanded(tree: Tree, node: NodeRef): boolean {
  return getNode(tree, node)?.backreferences?.expanded ?? false;
}

export function backreferencesChildren(tree: Tree, node: NodeRef): NodeRef[] {
  return getNode(tree, node)?.backreferences?.children ?? [];
}

export function markBackreferencesExpanded(tree: Tree, node: NodeRef, expanded: boolean): Tree {
  return updateNode(tree, node, (n) => ({...n, backreferences: {...n.backreferences, expanded}}));
}

export function updateBackreferencesChildren(
  tree: Tree,
  node: NodeRef,
  update: (children: NodeRef[]) => NodeRef[],
): Tree {
  return updateNode(tree, node, (n) => ({
    ...n,
    backreferences: {...n.backreferences, children: update(n.backreferences.children)},
  }));
}

// Parents as children ("other parents")

export function otherParentsExpanded(tree: Tree, node: NodeRef): boolean {
  return getNode(tree, node)?.otherParents?.expanded ?? false;
}

export function otherParentsChildren(tree: Tree, node: NodeRef): NodeRef[] {
  return getNode(tree, node)?.otherParents?.children ?? [];
}

export function markOtherParentsExpanded(tree: Tree, node: NodeRef, expanded: boolean): Tree {
  return updateNode(tree, node, (n) => ({...n, otherParents: {...n.otherParents, expanded}}));
}

export function updateOtherParentsChildren(
  tree: Tree,
  node: NodeRef,
  update: (children: NodeRef[]) => NodeRef[],
): Tree {
  return updateNode(tree, node, (n) => ({
    ...n,
    otherParents: {...n.otherParents, children: update(n.otherParents.children)},
  }));
}

// Internal links
// (See comment in Tree module)

export function openedLinkNode(tree: Tree, node: NodeRef, link: string): NodeRef | undefined {
  return getNode(tree, node)?.openedLinks[link];
}

export function setOpenedLinkNode(tree: Tree, node: NodeRef, link: string, linkNode: NodeRef | null) {
  if (linkNode === null) {
    return updateNode(tree, node, (n) => ({...n, openedLinks: Misc.removeKey(n.openedLinks, link)}));
  } else {
    return updateNode(tree, node, (n) => ({...n, openedLinks: {...n.openedLinks, [link]: linkNode}}));
  }
}

export function openedLinksChildren(tree: Tree, node: NodeRef): NodeRef[] {
  const result: NodeRef[] = [];

  for (const n of Object.values(getNode(tree, node)?.openedLinks ?? {})) {
    if (n !== undefined) result.push(n);
  }

  return result;
}
