/// <reference types="@types/jest" />

import * as T from "../src/tree";
import * as D from "../src/data";

test("Creating a thing with a custom ID returns that ID.", () => {
  expect(D.create(D.empty, "custom-id")[1]).toBe("custom-id");
});

test("Creating a child is reflected in other parents in the tree.", () => {
  let state = D.empty;
  state = D.setContent(state, "0", "Root");
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
  state = D.setContent(state, "0", "Root");
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
  state = D.setContent(state, "0", "Root");
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
