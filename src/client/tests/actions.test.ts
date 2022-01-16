/// <reference types="@types/jest" />

import * as App from "../src/app";

import * as D from "../src/data";
import * as Tu from "../src/tutorial";
import * as T from "../src/tree";

import * as A from "../src/actions";
import {GoalId} from "../src/goal";

describe.each(["find", "new"] as A.ActionName[])("an action that is always enabled", (action) => {
  let data_ = D.empty;
  data_ = D.addChild(data_, "0", "1")[0];
  let tree_ = T.fromRoot(data_, "0");

  it("is enabled even when no node is focused", () => {
    expect(A.enabled(App.from(data_, tree_), action)).toBe(true);
  });

  it("is also enabled when a node is focused", () => {
    let tree = T.focus(tree_, T.children(tree_, T.root(tree_))[0]);
    expect(A.enabled(App.from(data_, tree), action)).toBe(true);
  });
});

describe.each(["insert-sibling", "zoom", "indent", "new-child", "remove"] as A.ActionName[])(
  "an action that requires a target",
  (action) => {
    let data_ = D.empty;
    data_ = D.addChild(data_, "0", "1")[0];
    let tree_ = T.fromRoot(data_, "0");

    it("is disabled when no node is focused", () => {
      expect(A.enabled(App.from(data_, tree_), action)).toBe(false);
    });

    it("is enabled when a node is focused", () => {
      let tree = T.focus(tree_, T.children(tree_, T.root(tree_))[0]);
      expect(A.enabled(App.from(data_, tree), action)).toBe(true);
    });
  },
);

describe("new", () => {
  describe("when nothing is focused", () => {
    let data = D.empty;
    data = D.addChild(data, "0", "1")[0];
    let tree = T.fromRoot(data, "0");

    it("creates a new child of the root thing in the state", async () => {
      const app = App.from(data, tree);
      expect(D.children(app.state, "0").length).toBe(1);

      const result = (await A.update(App.from(data, tree), "new")).app!;
      expect(D.children(result.state, "0").length).toBe(2);
    });

    it("creates a new child of the root node in the tree", async () => {
      const app = App.from(data, tree);
      expect(T.children(app.tree, T.root(app.tree)).length).toBe(1);

      const result = (await A.update(App.from(data, tree), "new")).app!;
      expect(T.children(result.tree, T.root(result.tree)).length).toBe(2);
    });

    it("inserts the new item as the first child", async () => {
      const app = App.from(data, tree);
      const old = D.children(app.state, "0")[0];

      const result = (await A.update(app, "new")).app!;
      expect(D.children(result.state, "0")[0]).not.toBe(old);
      expect(D.children(result.state, "0")[1]).toBe(old);
    });
  });

  describe("when a node has focus", () => {
    let data = D.empty;
    data = D.addChild(data, "0", "1")[0];
    data = D.addChild(data, "0", "2")[0];

    let tree = T.fromRoot(data, "0");
    tree = T.focus(tree, T.children(tree, T.root(tree))[0]);

    const app = App.from(data, tree);

    it("inserts the new item after the focused item", async () => {
      expect(D.children(app.state, "0")[0]).toBe("1");
      expect(D.children(app.state, "0")[1]).toBe("2");

      const result = (await A.update(app, "new")).app!;

      expect(D.children(result.state, "0")[0]).toBe("1");
      expect(D.children(result.state, "0")[1]).not.toBe("1");
      expect(D.children(result.state, "0")[1]).not.toBe("2");
      expect(D.children(result.state, "0")[2]).toBe("2");
    });
  });

  it("completes the 'create-item' goal", async () => {
    function completed(app: App.App, goal: GoalId): boolean {
      return Tu.isGoalFinished(app.tutorialState, goal);
    }

    let data = D.empty;
    data = D.addChild(data, "0", "1")[0];
    let tree = T.fromRoot(data, "0");

    const app = App.from(data, tree);
    expect(completed(app, "create-item")).toBe(false);

    const result = (await A.update(app, "new")).app!;
    expect(completed(result, "create-item")).toBe(true);
  });
});
