/// <reference types="@types/jest" />

import * as T from "../src/tree";
import * as D from "../src/data";

test("Adding focused item as child of other item immediately updates list of parents", () => {
  let state = D.empty;

  state = D.create(state, "item")[0];
  state = D.create(state, "parent1")[0];
  state = D.create(state, "childparent")[0];
  state = D.addChild(state, "parent1", "item")[0];
  state = D.addChild(state, "item", "childparent")[0];

  let tree = T.fromRoot(state, "item");

  function expectOtherParentItemsToHaveExactly(items: string[]) {
    expect(T.otherParentsExpanded(tree, T.root(tree))).toBeTruthy();
    const otherParentsItems = T.otherParentsChildren(tree, T.root(tree)).map((node) => T.thing(tree, node));
    expect(T.otherParentsChildren(tree, T.root(tree)).length).toBe(items.length);
    for (const item of items) expect(otherParentsItems).toContainEqual(item);
  }

  expectOtherParentItemsToHaveExactly(["parent1"]);

  const childparentNode = T.children(tree, T.root(tree))[0];
  expect(T.thing(tree, childparentNode)).toBe("childparent");

  [state, tree] = T.insertChild(state, tree, childparentNode, "item", 0);

  expectOtherParentItemsToHaveExactly(["parent1", "childparent"]);
});

test("Removing focused item as child of other item immediately updates list of parents", () => {
  let state = D.empty;

  state = D.create(state, "item")[0];
  state = D.create(state, "parent1")[0];
  state = D.create(state, "childparent")[0];
  state = D.addChild(state, "parent1", "item")[0];
  state = D.addChild(state, "item", "childparent")[0];
  state = D.addChild(state, "childparent", "item")[0];

  let tree = T.fromRoot(state, "item");

  function expectOtherParentItemsToHaveExactly(items: string[]) {
    expect(T.otherParentsExpanded(tree, T.root(tree))).toBeTruthy();
    const otherParentsItems = T.otherParentsChildren(tree, T.root(tree)).map((node) => T.thing(tree, node));
    expect(T.otherParentsChildren(tree, T.root(tree)).length).toBe(items.length);
    for (const item of items) expect(otherParentsItems).toContainEqual(item);
  }

  expectOtherParentItemsToHaveExactly(["parent1", "childparent"]);

  const childparentNode = T.children(tree, T.root(tree))[0];
  expect(T.thing(tree, childparentNode)).toBe("childparent");
  tree = T.expand(state, tree, childparentNode);
  const itemInChildparentNode = T.children(tree, childparentNode)[0];
  expect(T.thing(tree, itemInChildparentNode)).toBe("item");

  [state, tree] = T.remove(state, tree, itemInChildparentNode);

  expectOtherParentItemsToHaveExactly(["parent1"]);
});

describe("removing a parent from the root node", () => {
  let data = D.empty;
  data = D.create(data, "1")[0];
  data = D.create(data, "2")[0];
  data = D.create(data, "3")[0];
  data = D.addChild(data, "1", "0")[0];
  data = D.addChild(data, "2", "0")[0];
  data = D.addChild(data, "3", "0")[0];

  let tree = T.fromRoot(data, "0");

  const [data_, tree_] = T.remove(data, tree, T.otherParentsChildren(tree, T.root(tree))[1]);

  test("removes the parent from the tree", () => {
    let parentThings = (t: T.Tree) => T.otherParentsChildren(t, T.root(t)).map((n) => T.thing(t, n));
    expect(parentThings(tree)).toEqual(["3", "2", "1"]);
    expect(parentThings(tree_)).toEqual(["3", "1"]);
  });

  test("removes the parent from the graph", () => {
    expect(D.parents(data, "0")).toEqual(["3", "2", "1"]);
    expect(D.parents(data_, "0")).toEqual(["3", "1"]);
  });
});

function childPath(tree: T.Tree, ...path: number[]): T.NodeRef {
  function childPath_(tree: T.Tree, root: T.NodeRef, path: number[]) {
    return path.length === 0 ? root : childPath_(tree, T.children(tree, root)[path[0]], path.slice(1));
  }
  return childPath_(tree, T.root(tree), path);
}

function childrenThings(tree: T.Tree, ...path: number[]): string[] {
  return T.children(tree, childPath(tree, ...path)).map((node) => T.thing(tree, node));
}

describe("moving a node", () => {
  test("trying to move the root item does nothing", () => {
    let state = D.empty;
    state = D.create(state, "0")[0];
    state = D.create(state, "1")[0];
    state = D.addChild(state, "0", "1")[0];

    let tree = T.fromRoot(state, "0");

    const [state_, tree_] = T.move(state, tree, T.root(tree), {
      parent: childPath(tree, 0),
      index: 0,
    });

    expect(childrenThings(tree, 0)).toEqual([]);
    expect(childrenThings(tree_, 0)).toEqual([]);
  });

  describe("after moving a single node with no subtree to another node with no subtree", () => {
    let state = D.empty;
    state = D.create(state, "0")[0];
    state = D.create(state, "1")[0];
    state = D.create(state, "2")[0];
    state = D.addChild(state, "0", "1")[0];
    state = D.addChild(state, "0", "2")[0];

    const tree = T.fromRoot(state, "0");

    const [state_, tree_] = T.move(state, tree, childPath(tree, 1), {
      parent: childPath(tree, 0),
      index: 0,
    });

    test("the original node is removed from its original parent in the tree", () => {
      expect(childrenThings(tree)).toEqual(["1", "2"]);
      expect(childrenThings(tree_)).toEqual(["1"]);
    });

    test("the original item is removed from its original parent in the graph", () => {
      expect(D.children(state, "0")).toEqual(["1", "2"]);
      expect(D.children(state_, "0")).toEqual(["1"]);
    });

    test("a new node is inserted at the new parent in the tree", () => {
      expect(childrenThings(tree, 0)).toEqual([]);
      expect(childrenThings(tree_, 0)).toEqual(["2"]);
    });

    test("a new item is inserted at the new parent in the graph", () => {
      expect(D.children(state, "1")).toEqual([]);
      expect(D.children(state_, "1")).toEqual(["2"]);
    });
  });

  describe("when the node being moved exists inside its old parent in mulitple locations", () => {
    let state = D.empty;
    state = D.create(state, "0")[0];
    state = D.create(state, "old-parent")[0];
    state = D.create(state, "new-parent")[0];
    state = D.create(state, "moving")[0];
    state = D.addChild(state, "0", "new-parent")[0];
    state = D.addChild(state, "0", "old-parent")[0];
    state = D.addChild(state, "0", "old-parent")[0];
    state = D.addChild(state, "old-parent", "moving")[0];

    let tree = T.fromRoot(state, "0");
    tree = T.expand(state, tree, childPath(tree, 1));
    tree = T.expand(state, tree, childPath(tree, 2));

    const [state_, tree_] = T.move(state, tree, childPath(tree, 1, 0), {
      parent: childPath(tree, 0),
      index: 0,
    });

    test("the original node is removed from both parents in the tree", () => {
      expect(childrenThings(tree, 1)).toEqual(["moving"]);
      expect(childrenThings(tree, 2)).toEqual(["moving"]);

      expect(childrenThings(tree_, 1)).toEqual([]);
      expect(childrenThings(tree_, 2)).toEqual([]);
    });
  });

  describe("when the new parent is shown in mulitple locations", () => {
    let state = D.empty;
    state = D.create(state, "0")[0];
    state = D.create(state, "new-parent")[0];
    state = D.create(state, "moving")[0];
    state = D.addChild(state, "0", "new-parent")[0];
    state = D.addChild(state, "0", "new-parent")[0];
    state = D.addChild(state, "0", "moving")[0];

    let tree = T.fromRoot(state, "0");

    const [state_, tree_] = T.move(state, tree, childPath(tree, 2), {
      parent: childPath(tree, 0),
      index: 0,
    });

    test("the new node is added to the new parent in both locations", () => {
      expect(childrenThings(tree, 0)).toEqual([]);
      expect(childrenThings(tree, 1)).toEqual([]);

      expect(childrenThings(tree_, 0)).toEqual(["moving"]);
      expect(childrenThings(tree_, 1)).toEqual(["moving"]);
    });

    test("the parent of each new node is the local parent in the tree", () => {
      expect(T.parent(tree_, childPath(tree_, 0, 0))).toEqual(childPath(tree_, 0));
      expect(T.parent(tree_, childPath(tree_, 1, 0))).toEqual(childPath(tree_, 1));
    });
  });
});
