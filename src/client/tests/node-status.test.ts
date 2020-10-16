/// <reference types="@types/jest" />

import {nodeStatus} from "../src/node-status";

import * as D from "../src/data";
import * as T from "../src/tree";

test("a node with no connections other than its parent is terminal", () => {
  let state = D.addChild(D.empty, "0", "child")[0];
  let tree = T.fromRoot(state, "0");

  const node = T.children(tree, T.root(tree))[0];
  expect(T.thing(tree, node)).toBe("child");

  expect(nodeStatus(tree, node)).toBe("terminal");
});

describe("an item that is referenced from somewhere else", () => {
  let state = D.empty;
  [state] = D.addChild(state, "0", "item");
  state = D.setContent(D.create(state, "ref")[0], "ref", [{link: "item"}]);

  let tree = T.fromRoot(state, "0");

  const node = T.children(tree, T.root(tree))[0];
  expect(T.thing(tree, node)).toBe("item");

  test("starts out collapsed", () => {
    expect(nodeStatus(tree, node)).toBe("collapsed");
  });

  test("can be expanded", () => {
    tree = T.toggle(state, tree, node);
    expect(nodeStatus(tree, node)).toBe("expanded");
  });
});
