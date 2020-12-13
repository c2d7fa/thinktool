/// <reference types="@types/jest" />

import * as Item from "../src/ui/Item";

import {appState} from "./misc";

import * as D from "../src/data";
import * as T from "../src/tree";

/// <reference types="@types/jest" />

test("a node with no connections except from its parent is terminal", () => {
  let state = D.addChild(D.empty, "0", "child")[0];
  let tree = T.fromRoot(state, "0");

  const node = T.children(tree, T.root(tree))[0];
  expect(T.thing(tree, node)).toBe("child");

  expect(Item.status(tree, node)).toBe("terminal");
});

test("an item that has no connections except from two parents is terminal", () => {
  let state = D.empty;
  state = D.addChild(state, "0", "item")[0];
  state = D.addChild(D.create(state, "parent")[0], "parent", "item")[0];

  let tree = T.fromRoot(state, "0");

  const node = T.children(tree, T.root(tree))[0];
  expect(T.thing(tree, node)).toBe("item");

  expect(Item.status(tree, node)).toBe("terminal");
});

describe("an item that is referenced from somewhere else", () => {
  let state = D.empty;
  [state] = D.addChild(state, "0", "item");
  state = D.setContent(D.create(state, "ref")[0], "ref", [{link: "item"}]);

  let tree = T.fromRoot(state, "0");

  const node = T.children(tree, T.root(tree))[0];
  expect(T.thing(tree, node)).toBe("item");

  test("starts out collapsed", () => {
    expect(Item.status(tree, node)).toBe("collapsed");
  });

  test("can be expanded", () => {
    tree = T.toggle(state, tree, node);
    expect(Item.status(tree, node)).toBe("expanded");
  });
});
