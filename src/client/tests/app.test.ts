/// <reference types="@types/jest" />

import * as A from "../src/app";
import * as D from "../src/data";
import * as T from "../src/tree";

describe("initializing app from scratch with 'of'", () => {
  const app: A.App = A.of({
    "0": {content: ["Item 0"], children: ["1", "2"]},
    "1": {content: ["Item 1 with link to ", {link: "0"}]},
    "2": {content: ["Item 2"], children: ["2"]},
  });

  test("focuses item with ID '0'", () => {
    expect(T.thing(app.tree, T.root(app.tree))).toBe("0");
  });

  test("sets the content of each item", () => {
    expect(D.contentEq(D.content(app.state, "0"), ["Item 0"])).toBeTruthy();
    expect(D.contentEq(D.content(app.state, "1"), ["Item 1 with link to ", {link: "0"}])).toBeTruthy();
    expect(D.contentEq(D.content(app.state, "2"), ["Item 2"])).toBeTruthy();
  });

  test("updates the children in the graph model", () => {
    expect(D.children(app.state, "0")).toEqual(["1", "2"]);
    expect(D.children(app.state, "1")).toEqual([]);
    expect(D.children(app.state, "2")).toEqual(["2"]);
  });

  test("loads children of the focused item into the tree model", () => {
    function childThing(n: number): string {
      return T.thing(app.tree, T.children(app.tree, T.root(app.tree))[n]);
    }
    expect(childThing(0)).toBe("1");
    expect(childThing(1)).toBe("2");
  });
});

describe("jumping to an item", () => {
  const before = A.of({
    "0": {content: ["Item 0"]},
    "1": {content: ["Item 1"]},
  });

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

describe("when toggling a link", () => {
  const initial = A.of({
    "0": {content: ["This item has a link to ", {link: "1"}, "."]},
    "1": {content: ["Another Item"]},
  });

  const expanded = A.toggleLink(initial, T.root(initial.tree), "1");

  const collapsed = A.toggleLink(expanded, T.root(expanded.tree), "1");

  function openedRoot(tree: T.Tree): string[] {
    return T.openedLinksChildren(tree, T.root(tree)).map((c) => T.thing(tree, c));
  }

  describe("when the link is first toggled", () => {
    test("the linked item is added as an opened link", () => {
      expect(openedRoot(initial.tree)).toEqual([]);
      expect(openedRoot(expanded.tree)).toEqual(["1"]);
    });

    test("the 'expand-link' goal is completed", () => {
      expect(A.isGoalFinished(initial, "expand-link")).toBe(false);
      expect(A.isGoalFinished(expanded, "expand-link")).toBe(true);
    });
  });

  describe("when the link is collapsed", () => {
    test("the linked item is removed", () => {
      expect(openedRoot(expanded.tree)).toEqual(["1"]);
      expect(openedRoot(collapsed.tree)).toEqual([]);
    });

    test("the goal remains completed", () => {
      expect(A.isGoalFinished(expanded, "expand-link")).toBe(true);
      expect(A.isGoalFinished(collapsed, "expand-link")).toBe(true);
    });
  });
});
