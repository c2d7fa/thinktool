/// <reference types="@types/jest" />

import * as A from "../src/app";
import * as D from "../src/data";
import * as T from "../src/tree";

describe("jumping to an item", () => {
  let state = D.empty;
  state = D.create(state, "0")[0];
  state = D.create(state, "1")[0];
  state = D.setContent(state, "0", ["Item 0"]);
  state = D.setContent(state, "1", ["Item 1"]);

  const tree = T.fromRoot(state, "0");

  const before = A.from(state, tree);
  const after = A.jump(before, "1");

  test("the focused item is updated", () => {
    expect(T.thing(before.tree, T.root(before.tree))).toBe("0");
    expect(T.thing(after.tree, T.root(after.tree))).toBe("1");
  });

  test("the 'jump-item' goal is completed", () => {
    expect(A.isGoalFinished(before, "jump-item")).toBe(false);
    expect(A.isGoalFinished(after, "jump-item")).toBe(true);
  });
});
