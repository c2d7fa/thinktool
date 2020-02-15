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

export type Destination = {parent: NodeRef; index: number};

export function fromRoot(state: Things, thing: string): Tree {
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
  return tree.nodes[node.id].thing;
}

export function expanded(tree: Tree, node: NodeRef): boolean {
  return tree.nodes[node.id].expanded;
}

export function hasFocus(tree: Tree, node: NodeRef): boolean {
  return tree.focus?.id === node.id;
}

export function focus(tree: Tree, node: NodeRef): Tree {
  return {...tree, focus: node};
}

export function unfocus(tree: Tree): Tree {
  return {...tree, focus: null};
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
  if (tree.focus === null)
    throw "Cannot move focus because nothing is focused";
  return {...tree, focus: previousVisibleItem(tree, tree.focus)};
}

export function focusDown(tree: Tree): Tree {
  if (tree.focus === null)
    throw "Cannot move focus because nothing is focused";

  return {...tree, focus: nextVisibleItem(tree, tree.focus)};
}

function refreshChildren(state: Things, tree: Tree, parent: NodeRef): Tree {
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
    let result: Tree = {...tree, nodes: {...tree.nodes, [parent.id]: {...tree.nodes[parent.id], children: [...tree.nodes[parent.id].children]}}};

    for (let i = 0; i < stateChildren.length; i++) {
      if (children(result, parent)[i] === undefined) {
        const [newChild, newResult] = load(state, result, stateChildren[i]);
        result = newResult;
        result.nodes[parent.id].children.splice(i, 0, newChild);
      } else {
        if (thing(result, children(result, parent)[i]) === stateChildren[i])
          continue;
        const [newChild, newResult] = load(state, result, stateChildren[i]);
        result = newResult;
        result.nodes[parent.id].children.splice(i, 0, newChild, children(result, parent)[i]);
      }
    }

    // In case our assumption was wrong, truncate any extra elements that were inserted.
    result.nodes[parent.id].children.splice(stateChildren.length);

    return result;
  } else {
    // We can't make any assumptions; just recreate the entire children array

    // TODO: Clean up removed children.
    let result: Tree = {...tree, nodes: {...tree.nodes, [parent.id]: {...tree.nodes[parent.id], children: []}}};

    for (const childThing of stateChildren) {
      const [newChild, newResult] = load(state, result, childThing);
      result = newResult;
      result.nodes[parent.id].children = [...result.nodes[parent.id].children, newChild];
    }

    return result;
  }
}

export function expand(state: Things, tree: Tree, node: NodeRef): Tree {
  if (!expanded(tree, node))
    return toggle(state, tree, node);
  else
    return tree;
}

export function toggle(state: Things, tree: Tree, node: NodeRef): Tree {
  let expanded = !tree.nodes[node.id].expanded;

  if (!D.hasChildren(state, thing(tree, node)) && D.backreferences(state, thing(tree, node)).length === 0) {
    // Items without children (including backreferences) are always expanded
    expanded = true;
  }

  // Update expanded status
  let result = {...tree, nodes: {...tree.nodes, [node.id]: {...tree.nodes[node.id], expanded}}};

  // Load children from state if necessary
  if (result.nodes[node.id].children.length === 0)
    result = refreshChildren(state, result, node);

  return result;
}

export function load(state: Things, tree: Tree, thing: string): [NodeRef, Tree] {
  const id = tree.nextId;

  // Update next ID
  let result = {...tree, nextId: tree.nextId + 1};

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

  // If the child has no children (including backreferences), it should be expanded by default
  if (!D.hasChildren(state, thing) && D.backreferences(state, thing).length === 0)
    result.nodes[id].expanded = true;

  return [{id}, result];
}

export function children(tree: Tree, parent: NodeRef): NodeRef[] {
  return tree.nodes[parent.id].children;
}

// Refresh the nodes of a tree based on the state, such that relevant changes in
// the state are reflected in the tree.
export function refresh(tree: Tree, state: Things): Tree {
  let result = tree;
  for (const id in tree.nodes) {
    if (D.exists(state, thing(tree, {id: +id}))) { // Otherwise, it will be removed from its parents in refreshChildren.
      result = refreshChildren(state, result, {id: +id});
      result = refreshBackreferencesChildren(state, result, {id: +id});
    }
  }
  return result;
}

export function indent(state: Things, tree: Tree, node: NodeRef): [Things, Tree] {
  if (tree.root.id === node.id)
    return [state, tree];

  const parent_ = parent(tree, node);
  const index = indexInParent(tree, node);

  if (parent_ === undefined || index === undefined || index === 0)
    return [state, tree];

  const newState = D.indent(state, thing(tree, parent_), index);

  // TODO: A lot of this logic is similar to Data.indent, but I'm not sure if we
  // can express one in terms of the other.

  let newTree: Tree = {...tree, nodes: {...tree.nodes, [parent_.id]: {...tree.nodes[parent_.id], children: [...tree.nodes[parent_.id].children]}}};
  newTree.nodes[parent_.id].children.splice(index, 1);

  const newParent = tree.nodes[parent_.id].children[index - 1];
  newTree = {...newTree, nodes: {...newTree.nodes, [newParent.id]: {...tree.nodes[newParent.id], children: [...tree.nodes[newParent.id].children]}}};
  newTree.nodes[newParent.id].children.push(node);

  newTree = expand(newState, newTree, newParent);

  return [newState, refresh(newTree, newState)];
}

export function unindent(state: Things, tree: Tree, node: NodeRef): [Things, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    return [state, tree];

  const grandparent = parent(tree, parent_);
  if (grandparent === undefined)
    return [state, tree];

  return move(state, tree, node, {parent: grandparent, index: childIndex(tree, grandparent, parent_) + 1});
}

function parent(tree: Tree, child: NodeRef): NodeRef | undefined {
  for (const parentId in tree.nodes)
    if (children(tree, {id: +parentId}).map(x => x.id).includes(child.id))
      return {id: +parentId};
  return undefined;
}

function childIndex(tree: Tree, parent: NodeRef, child: NodeRef): number {
  return children(tree, parent).map(x => x.id).indexOf(child.id);
}

export function move(state: Things, tree: Tree, node: NodeRef, destination: Destination): [Things, Tree] {
  const parent_ = parent(tree, node);

  if (parent_ === undefined)
    return [state, tree]; // Can't move root

  let newState = D.removeChild(state, thing(tree, parent_), indexInParent(tree, node)!);
  newState = D.insertChild(newState, thing(tree, destination.parent), thing(tree, node), destination.index);

  let newTree = refresh(tree, newState);  // TODO: Could be improved

  // Keep focus
  if (tree.focus?.id === node.id)
    newTree = {...newTree, focus: children(newTree, destination.parent)[destination.index]};

  return [newState, newTree];
}

export function moveToAbove(state: Things, tree: Tree, sourceNode: NodeRef, destinationNode: NodeRef): [Things, Tree] {
  const parent_ = parent(tree, destinationNode);
  if (parent_ === undefined)
    return [state, tree];
  return move(state, tree, sourceNode, {parent: parent_, index: childIndex(tree, parent_, destinationNode)});
}

export function moveUp(state: Things, tree: Tree, node: NodeRef): [Things, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined || childIndex(tree, parent_, node) === 0)
    return [state, tree];
  return move(state, tree, node, {parent: parent_, index: childIndex(tree, parent_, node) - 1});
}

export function moveDown(state: Things, tree: Tree, node: NodeRef): [Things, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined || childIndex(tree, parent_, node) === children(tree, parent_).length - 1)
    return [state, tree];
  return move(state, tree, node, {parent: parent_, index: childIndex(tree, parent_, node) + 1});
}

export function copy(state: Things, tree: Tree, node: NodeRef, destination: Destination): [Things, Tree, NodeRef] {
  const newState = D.insertChild(state, thing(tree, destination.parent), thing(tree, node), destination.index);
  const newTree = refreshChildren(newState, tree, destination.parent);
  return [newState, newTree, children(newTree, destination.parent)[destination.index]];
}

export function copyToAbove(state: Things, tree: Tree, sourceNode: NodeRef, destinationNode: NodeRef): [Things, Tree, NodeRef] {
  const parent_ = parent(tree, destinationNode);
  if (parent_ === undefined)
    return [state, tree, sourceNode];
  return copy(state, tree, sourceNode, {parent: parent_, index: childIndex(tree, parent_, destinationNode)});
}

export function createSiblingBefore(state: Things, tree: Tree, node: NodeRef): [Things, Tree, string, NodeRef] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    throw "Cannot create sibling before item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, node);

  newState = D.insertChild(newState, parentThing, newThing, index);

  let newTree = tree;
  const [newId, newTree_] = load(newState, tree, newThing);
  newTree = newTree_;
  newTree = {...newTree, nodes: {...newTree.nodes, [parent_.id]: {...newTree.nodes[parent_.id], children: [...newTree.nodes[parent_.id].children]}}};
  newTree.nodes[parent_.id].children.splice(index, 0, newId);

  newTree = refresh(newTree, newState);

  return [newState, newTree, newThing, newId];
}


export function createSiblingAfter(state: Things, tree: Tree, node: NodeRef): [Things, Tree, string, NodeRef] {
  let newState = state;

  const [newState_, newThing] = D.create(newState);
  newState = newState_;

  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    throw "Cannot create sibling after item with no parent";

  const parentThing = thing(tree, parent_);
  const index = childIndex(tree, parent_, node) + 1;

  newState = D.insertChild(newState, parentThing, newThing, index);

  let newTree = tree;
  const [newNode, newTree_] = load(newState, tree, newThing);
  newTree = newTree_;
  newTree = {...newTree, nodes: {...newTree.nodes, [parent_.id]: {...newTree.nodes[parent_.id], children: [...newTree.nodes[parent_.id].children]}}};
  newTree.nodes[parent_.id].children.splice(index, 0, newNode);

  newTree = refresh(newTree, newState);

  return [newState, newTree, newThing, newNode];
}

export function createChild(state: Things, tree: Tree, node: NodeRef): [Things, Tree, string, NodeRef] {
  // Create item as child
  const [state1, childThing] = D.create(state);
  const state2 = D.addChild(state1, thing(tree, node), childThing);

  // Load it into the tree
  const tree1 = expand(state, tree, node);
  const [childNode, tree2] = load(state2, tree1, childThing);
  const tree3 = {...tree2, nodes: {...tree2.nodes, [node.id]: {...tree2.nodes[node.id], children: [...tree2.nodes[node.id].children, childNode]}}};
  const tree4 = focus(tree3, childNode);

  return [state2, tree4, childThing, childNode];
}

export function remove(state: Things, tree: Tree, node: NodeRef): [Things, Tree] {
  const parent_ = parent(tree, node);
  if (parent_ === undefined)
    return [state, tree];

  const newState = D.removeChild(state, thing(tree, parent_), childIndex(tree, parent_, node));
  const newTree = focus(tree, previousVisibleItem(tree, node));

  return [newState, refresh(newTree, newState)];
}

export function backreferencesExpanded(tree: Tree, node: NodeRef): boolean {
  return tree.nodes[node.id].backreferences.expanded;
}

// TODO: Massive code duplication between this and 'refreshChildren'
function refreshBackreferencesChildren(state: Things, tree: Tree, parent: NodeRef): Tree {
  function arrayEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (a[i] !== b[i])
        return false;
    return true;
  }

  const stateChildren = D.backreferences(state, thing(tree, parent));
  const treeChildren = tree.nodes[parent.id].backreferences.children.map(ch => thing(tree, ch));

  if (!expanded(tree, parent))
    return tree;
  if (arrayEqual(stateChildren, treeChildren))
    return tree;

  if (stateChildren.length === treeChildren.length + 1) {
    // Assume new child was inserted

    // Copy children so we can mutate it for convencience
    let result: Tree = {...tree, nodes: {...tree.nodes, [parent.id]: {...tree.nodes[parent.id], backreferences: {...tree.nodes[parent.id].backreferences, children: [...tree.nodes[parent.id].backreferences.children]}}}};

    for (let i = 0; i < stateChildren.length; i++) {
      if (result.nodes[parent.id].backreferences.children[i] === undefined) {
        const [newChild, newResult] = load(state, result, stateChildren[i]);
        result = newResult;
        result.nodes[parent.id].backreferences.children.splice(i, 0, newChild);
      } else {
        if (thing(result, result.nodes[parent.id].backreferences.children[i]) === stateChildren[i])
          continue;
        const [newChild, newResult] = load(state, result, stateChildren[i]);
        result = newResult;
        result.nodes[parent.id].backreferences.children.splice(i, 0, newChild, result.nodes[parent.id].backreferences.children[i]);
      }
    }

    // In case our assumption was wrong, truncate any extra elements that were inserted.
    result.nodes[parent.id].backreferences.children.splice(stateChildren.length);

    return result;
  } else {
    // We can't make any assumptions; just recreate the entire children array

    // TODO: Clean up removed children.
    let result: Tree = {...tree, nodes: {...tree.nodes, [parent.id]: {...tree.nodes[parent.id], backreferences: {...tree.nodes[parent.id].backreferences, children: []}}}};

    for (const childThing of stateChildren) {
      const [newChild, newResult] = load(state, result, childThing);
      result = newResult;
      result.nodes[parent.id].backreferences.children = [...result.nodes[parent.id].backreferences.children, newChild];
    }

    return result;
  }
}

export function toggleBackreferences(state: Things, tree: Tree, node: NodeRef): Tree {
  const expanded = !tree.nodes[node.id].backreferences.expanded;

  let result = {...tree, nodes: {...tree.nodes, [node.id]: {...tree.nodes[node.id], backreferences: {...tree.nodes[node.id].backreferences, expanded}}}};

  // Load children if necessary
  if (expanded) {
    result = refreshBackreferencesChildren(state, result, node);
  }

  return result;
}

export function backreferencesChildren(tree: Tree, node: NodeRef): NodeRef[] {
  return tree.nodes[node.id].backreferences.children;
}

export function insertChild(state: Things, tree: Tree, node: NodeRef, child: string, position: number): [Things, Tree] {
  const newState = D.insertChild(state, thing(tree, node), child, position);
  return [newState, refresh(tree, newState)];
}

export function removeThing(state: Things, tree: Tree, node: NodeRef): [Things, Tree] {
  const newState = D.remove(state, thing(tree, node));
  return [newState, refresh(tree, newState)];
}
