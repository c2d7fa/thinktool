import * as Misc from "@johv/miscjs";
import * as Immutable from "immutable";

import * as D from "../data";

// By convention, fields prefixed with an underscore are "module private". They
// may not be accessed outside the 'tree' modules.

export interface Node {
  _thing: string;
  _connection?: D.Connection; // undefined for root item (and other non-applicable items). // [TODO] Is this comment correct?
  _expanded: boolean;
  _source: Source;
  _children: NodeRef[];
  _backreferences: {expanded: boolean; children: NodeRef[]};
  _otherParents: {expanded: boolean; children: NodeRef[]};
  _openedLinks: {[thing: string]: NodeRef | undefined};
}

export type Source =
  | {type: "child" | "other-parent" | "reference" | "opened-link"; parent: NodeRef}
  | {type: "root"};

export interface Tree {
  _nextId: number;
  _root: NodeRef;
  _nodes: Immutable.Map<number, Node>;
  _focus: null | NodeRef;
}

export type NodeRef = {id: number};

function getNode(tree: Tree, node: NodeRef): Node | undefined {
  return tree._nodes.get(node.id);
}

function updateNode(tree: Tree, node: NodeRef, update: (node: Node) => Node): Tree {
  const data = getNode(tree, node);
  if (data === undefined) {
    console.warn("Couldn't update node %o, because it didn't exist in %o", node, tree);
    return tree;
  }

  return {...tree, _nodes: tree._nodes.set(node.id, update(data))};
}

export function fromRoot(thing: string): Tree {
  return {
    _nextId: 1,
    _root: {id: 0},
    _nodes: Immutable.Map([
      [
        0,
        {
          _thing: thing,
          _source: {type: "root"},
          _expanded: false,
          _children: [],
          _backreferences: {expanded: false, children: []},
          _otherParents: {expanded: false, children: []},
          _openedLinks: {},
        },
      ],
    ]),
    _focus: null,
  };
}

export function root(tree: Tree): NodeRef {
  return tree._root;
}

export function exists(tree: Tree, node: NodeRef): boolean {
  return tree._nodes.has(node.id);
}

export function thing(tree: Tree, node: NodeRef): string {
  const thing = getNode(tree, node)?._thing;
  if (thing === undefined) {
    alert("A fatal error occurred. Please check the developer console for more information.");
    throw {message: "Could not get item for node", node, tree};
  }
  return thing;
}

export function source(tree: Tree, node: NodeRef): Source | undefined {
  return getNode(tree, node)?._source;
}

export function expanded(tree: Tree, node: NodeRef): boolean {
  if (getNode(tree, node) === undefined)
    console.warn("Assuming non-existent node %o in %o is not expanded", node, tree);
  return getNode(tree, node)?._expanded ?? false;
}

export function focused(tree: Tree): NodeRef | null {
  return tree._focus;
}

export function hasFocus(tree: Tree, node: NodeRef): boolean {
  return tree._focus?.id === node.id;
}

export function getFocus(tree: Tree): NodeRef | null {
  return tree._focus;
}

export function focus(tree: Tree, node: NodeRef): Tree {
  return {...tree, _focus: node};
}

export function unfocus(tree: Tree): Tree {
  return {...tree, _focus: null};
}

export function markExpanded(tree: Tree, node: NodeRef, expanded: boolean): Tree {
  return updateNode(tree, node, (n) => ({...n, _expanded: expanded}));
}

export function children(tree: Tree, node: NodeRef): NodeRef[] {
  if (getNode(tree, node) === undefined)
    console.warn("Could not get children of non-existent node %o in %o", node, tree);
  return getNode(tree, node)?._children ?? [];
}

export function loadThing(tree: Tree, thing: string, source: Source, connection?: D.Connection): [NodeRef, Tree] {
  return [
    {id: tree._nextId},
    {
      ...tree,
      _nextId: tree._nextId + 1,
      _nodes: tree._nodes.set(tree._nextId, {
        _thing: thing,
        _source: source,
        _connection: connection,
        _expanded: false,
        _children: [],
        _backreferences: {expanded: false, children: []},
        _otherParents: {expanded: false, children: []},
        _openedLinks: {},
      }),
    },
  ];
}

export function* allNodes(tree: Tree): Generator<NodeRef> {
  for (const id of tree._nodes.keys()) {
    yield {id};
  }
}

export function updateChildren(tree: Tree, node: NodeRef, update: (children: NodeRef[]) => NodeRef[]): Tree {
  return updateNode(tree, node, (n) => ({...n, _children: update(n._children)}));
}

export function connection(tree: Tree, node: NodeRef): D.Connection | undefined {
  return getNode(tree, node)?._connection;
}

// Backreferences

export function backreferencesExpanded(tree: Tree, node: NodeRef): boolean {
  return getNode(tree, node)?._backreferences?.expanded ?? false;
}

export function backreferencesChildren(tree: Tree, node: NodeRef): NodeRef[] {
  return getNode(tree, node)?._backreferences?.children ?? [];
}

export function markBackreferencesExpanded(tree: Tree, node: NodeRef, expanded: boolean): Tree {
  return updateNode(tree, node, (n) => ({...n, _backreferences: {...n._backreferences, expanded}}));
}

export function updateBackreferencesChildren(
  tree: Tree,
  node: NodeRef,
  update: (children: NodeRef[]) => NodeRef[],
): Tree {
  return updateNode(tree, node, (n) => ({
    ...n,
    _backreferences: {...n._backreferences, children: update(n._backreferences.children)},
  }));
}

// Parents as children ("other parents")

export function otherParentsExpanded(tree: Tree, node: NodeRef): boolean {
  return getNode(tree, node)?._otherParents?.expanded ?? false;
}

export function otherParentsChildren(tree: Tree, node: NodeRef): NodeRef[] {
  return getNode(tree, node)?._otherParents?.children ?? [];
}

export function markOtherParentsExpanded(tree: Tree, node: NodeRef, expanded: boolean): Tree {
  return updateNode(tree, node, (n) => ({...n, _otherParents: {...n._otherParents, expanded}}));
}

export function updateOtherParentsChildren(
  tree: Tree,
  node: NodeRef,
  update: (children: NodeRef[]) => NodeRef[],
): Tree {
  return updateNode(tree, node, (n) => ({
    ...n,
    _otherParents: {...n._otherParents, children: update(n._otherParents.children)},
  }));
}

// Internal links
// (See comment in Tree module)

export function openedLinkNode(tree: Tree, node: NodeRef, link: string): NodeRef | undefined {
  return getNode(tree, node)?._openedLinks[link];
}

export function setOpenedLinkNode(tree: Tree, node: NodeRef, link: string, linkNode: NodeRef | null) {
  if (linkNode === null) {
    return updateNode(tree, node, (n) => ({...n, _openedLinks: Misc.removeKey(n._openedLinks, link)}));
  } else {
    return updateNode(tree, node, (n) => ({...n, _openedLinks: {...n._openedLinks, [link]: linkNode}}));
  }
}

export function openedLinksChildren(tree: Tree, node: NodeRef): NodeRef[] {
  const result: NodeRef[] = [];

  for (const n of Object.values(getNode(tree, node)?._openedLinks ?? {})) {
    if (n !== undefined) result.push(n);
  }

  return result;
}
