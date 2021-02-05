/// <reference types="@types/jest" />

import * as T from "../src/tree";
import * as D from "../src/data";

test("Creating a thing with a custom ID returns that ID.", () => {
  expect(D.create(D.empty, "custom-id")[1]).toBe("custom-id");
});

test("Creating a child is reflected in other parents in the tree.", () => {
  let state = D.empty;
  state = D.setContent(state, "0", ["Root"]);
  state = D.create(state, "a")[0];
  state = D.addChild(state, "0", "a")[0];
  state = D.addChild(state, "0", "a")[0];

  let tree = T.fromRoot(state, "0");

  // [TODO] We rely on implementation details about what IDs are assigned in the tree.

  expect(T.expanded(tree, {id: 1})).toBeTruthy();
  expect(T.expanded(tree, {id: 2})).toBeTruthy();

  const [state_, tree_, thing, node] = T.createChild(state, tree, {id: 1});
  state = state_;
  tree = tree_;

  expect(T.children(tree, {id: 1})).toEqual([node]);
  expect(T.children(tree, {id: 1}).length).toBe(1);

  expect(T.children(tree, {id: 2}).filter((c) => T.thing(tree, c) === thing).length).toBe(1);
  expect(T.children(tree, {id: 2}).length).toBe(1);
});

test("Indenting and removing item", () => {
  let state = D.empty;
  state = D.setContent(state, "0", ["Root"]);
  state = D.create(state, "a")[0];
  state = D.create(state, "b")[0];
  state = D.addChild(state, "0", "a")[0];
  state = D.addChild(state, "0", "b")[0];

  let tree = T.fromRoot(state, "0");

  // [TODO] We rely on implementation details about what IDs are assigned in the tree.

  expect(T.expanded(tree, {id: 1})).toBeTruthy();

  // Indent
  [state, tree] = T.indent(state, tree, {id: 2});
  expect(T.children(tree, {id: 1}).length).toBe(1);
  const indentedNode = T.children(tree, {id: 1})[0];

  // Delete
  [state, tree] = T.removeThing(state, tree, indentedNode);
  expect(T.children(tree, {id: 1}).length).toBe(0);
});

test("Removing a thing causes it to no longer exist.", () => {
  let state = D.empty;
  state = D.setContent(state, "0", ["Root"]);
  state = D.create(state, "a")[0];
  state = D.addChild(state, "0", "a")[0];

  let tree = T.fromRoot(state, "0");

  // [TODO] We rely on implementation details about what IDs are assigned in the tree.

  expect(D.exists(state, "a")).toBeTruthy();
  [state, tree] = T.removeThing(state, tree, {id: 1});
  expect(D.exists(state, "a")).toBeFalsy();
});

// Bug: Adding a parent creates a connection to the item. This would interfere
// when trying to manipulate the children by index, because the connection to
// the parent would be selected (due to its index) instead of the connection to
// the child.
test("Parents should not interfere when removing a child", () => {
  let state = D.empty;

  state = D.create(state, "child")[0];
  state = D.create(state, "parent")[0];

  state = D.addChild(state, "0", "child")[0];
  state = D.addChild(state, "parent", "0")[0];

  let tree = T.fromRoot(state, "0");

  // [TODO] We rely on implementation details about what IDs are assigned in the tree.

  expect(D.children(state, "0")).toEqual(["child"]);
  [state, tree] = T.remove(state, tree, {id: 1});
  expect(D.children(state, "0")).toEqual([]);
});

test("Newly created sibling should have focus", () => {
  let state = D.empty;

  state = D.create(state, "a")[0];
  state = D.addChild(state, "0", "a")[0];

  let tree = T.fromRoot(state, "0");
  tree = T.focus(tree, T.children(tree, T.root(tree))[0]);

  expect(T.hasFocus(tree, T.children(tree, T.root(tree))[0])).toBeTruthy();

  [state, tree] = T.createSiblingAfter(state, tree, {id: 1});

  expect(T.hasFocus(tree, T.children(tree, T.root(tree))[1])).toBeTruthy();
});

// Bug: Creating a child inside a collapsed parent would add that child twice
// in the tree.
test("Creating a child inside collapsed parent adds exactly one child in the tree", () => {
  let state = D.empty;

  state = D.create(state, "a")[0];
  state = D.create(state, "b")[0];
  state = D.addChild(state, "0", "a")[0];
  state = D.addChild(state, "a", "b")[0];

  let tree = T.fromRoot(state, "0");

  function a(): T.NodeRef {
    return T.children(tree, T.root(tree))[0];
  }

  expect(T.expanded(tree, a())).toBeFalsy();

  [state, tree] = T.createChild(state, tree, a());

  expect(T.children(tree, a()).length).toBe(2);
});

// Bug: Adding a child would cause all items to be collapsed.
test("Inserting a child should not cause all items to be collapsed", () => {
  let state = D.empty;

  state = D.create(state, "a")[0];
  state = D.create(state, "b")[0];
  state = D.create(state, "c")[0];
  state = D.addChild(state, "0", "a")[0];
  state = D.addChild(state, "0", "a")[0];
  state = D.addChild(state, "a", "b")[0];

  let tree = T.fromRoot(state, "0");

  tree = T.expand(state, tree, T.children(tree, T.root(tree))[0]);
  tree = T.expand(state, tree, T.children(tree, T.root(tree))[1]);

  expect(T.expanded(tree, T.children(tree, T.root(tree))[0])).toBeTruthy();
  expect(T.expanded(tree, T.children(tree, T.root(tree))[1])).toBeTruthy();

  [state, tree] = T.insertChild(state, tree, T.children(tree, T.root(tree))[0], "c", 0);

  expect(T.expanded(tree, T.children(tree, T.root(tree))[0])).toBeTruthy();
  expect(T.expanded(tree, T.children(tree, T.root(tree))[1])).toBeTruthy();
});

// Bug: Adding a parent would cause all items to be collapsed.
test("Inserting a parent should not cause all items to be collapsed", () => {
  let state = D.empty;

  state = D.create(state, "a")[0];
  state = D.create(state, "b")[0];
  state = D.create(state, "c")[0];
  state = D.addChild(state, "0", "a")[0];
  state = D.addChild(state, "0", "a")[0];
  state = D.addChild(state, "a", "b")[0];

  let tree = T.fromRoot(state, "0");

  tree = T.expand(state, tree, T.children(tree, T.root(tree))[0]);
  tree = T.expand(state, tree, T.children(tree, T.root(tree))[1]);

  expect(T.expanded(tree, T.children(tree, T.root(tree))[0])).toBeTruthy();
  expect(T.expanded(tree, T.children(tree, T.root(tree))[1])).toBeTruthy();

  [state, tree] = T.insertParent(state, tree, T.children(tree, T.root(tree))[0], "c");

  expect(T.expanded(tree, T.children(tree, T.root(tree))[0])).toBeTruthy();
  expect(T.expanded(tree, T.children(tree, T.root(tree))[1])).toBeTruthy();
});

test("Adding parent to focused item immediately updates list of other parents", () => {
  let state = D.empty;

  state = D.create(state, "item")[0];
  state = D.create(state, "parent1")[0];
  state = D.addChild(state, "parent1", "item")[0];

  let tree = T.fromRoot(state, "item");

  function expectOtherParentItemsToHaveExactly(items: string[]) {
    expect(T.otherParentsExpanded(tree, T.root(tree))).toBeTruthy();
    const otherParentsItems = T.otherParentsChildren(tree, T.root(tree)).map((node) => T.thing(tree, node));
    expect(T.otherParentsChildren(tree, T.root(tree)).length).toBe(items.length);
    for (const item of items) expect(otherParentsItems).toContainEqual(item);
  }

  expectOtherParentItemsToHaveExactly(["parent1"]);

  state = D.create(state, "parent2")[0];
  [state, tree] = T.insertParent(state, tree, T.root(tree), "parent2");

  expectOtherParentItemsToHaveExactly(["parent1", "parent2"]);
});

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
  });
});
