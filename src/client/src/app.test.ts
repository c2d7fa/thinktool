/// <reference types="@types/jest" />

import * as W from "./wrapap";
import * as A from "./app";
import * as D from "./data";
import * as T from "./tree";
import * as E from "./editor";

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

describe("reading selected text in focused editor", () => {
  const base = A.of({
    "0": {content: ["This is item 0."], children: ["1"]},
    "1": {content: ["This is item 1."]},
  });

  test("with text selected returns that text", () => {
    const focused = A.merge(base, {tree: T.focus(base.tree, T.children(base.tree, T.root(base.tree))[0])});
    expect(T.thing(focused.tree, T.focused(focused.tree)!)).toBe("1");

    const selected = A.edit(
      focused,
      T.focused(focused.tree)!,
      E.select(A.editor(focused, T.focused(focused.tree)!)!, {from: 8, to: 14}),
    );

    expect(A.selectedText(selected)).toBe("item 1");
  });

  test("with nothing focused returns an empty string", () => {
    expect(A.selectedText(base)).toBe("");
  });
});

describe("inserting a link in an editor", () => {
  const before = (() => {
    let app = A.of({
      "0": {content: ["This is item 0."]},
      "1": {content: ["This is item 1."]},
    });
    app = A.edit(app, T.root(app.tree), E.select(A.editor(app, T.root(app.tree))!, {from: 8, to: 14}));
    return app;
  })();

  const after = A.editInsertLink(before, T.root(before.tree), "1");

  const editorBefore = A.editor(before, T.root(before.tree))!;
  const editorAfter = A.editor(after, T.root(after.tree))!;

  it("updates the content so the selection is replaced with the link", () => {
    expect(editorBefore.content).toEqual(["This is item 0."]);
    expect(editorAfter.content).toEqual(["This is ", {link: "1", title: "This is item 1."}, "."]);
  });

  it("sets the selection to be after the inserted link", () => {
    expect(editorBefore.selection).toEqual({from: 8, to: 14});
    expect(editorAfter.selection).toEqual({from: 9, to: 9});
  });
});

describe("after creating a new child", () => {
  const before = A.of({
    "0": {content: ["Item 0"]},
  });

  const after = A.createChild(before, T.root(before.tree));

  test("the parent item gets a new child", () => {
    expect(T.children(before.tree, T.root(before.tree)).length).toBe(0);
    expect(T.children(after.tree, T.root(after.tree)).length).toBe(1);
  });

  test("the child is focused", () => {
    const child = W.from(after).root.child(0)!.ref;
    expect(T.hasFocus(after.tree, child)).toBe(true);
  });
});

describe("unfolding an item", () => {
  describe("when the item has no children", () => {
    const before = W.of({
      "0": {content: []},
    });

    const after = before.map((app) => A.unfold(app, before.root.ref));

    it("doesn't add any new children", () => {
      expect(before.root.expanded && before.root.nchildren).toBe(0);
      expect(after.root.expanded && after.root.nchildren).toBe(0);
    });
  });

  describe("when the outline is strictly a tree", () => {
    it("expands the parent", () => {
      const before = W.of({
        "0": {content: [], children: ["1"]},
        "1": {content: [], children: ["2"]},
        "2": {content: []},
      });

      const after = before.map((app) => A.unfold(app, before.root.child(0)!.ref));

      expect(before.root.child(0)!.expanded).toBe(false);
      expect(after.root.child(0)!.expanded).toBe(true);
    });

    it("expands each of the children", () => {
      const before = W.of({
        "0": {content: [], children: ["1"]},
        "1": {content: [], children: ["2", "3"]},
        "2": {content: [], children: ["4"]},
        "3": {content: [], children: ["5"]},
        "4": {content: []},
        "5": {content: []},
      });

      const after = before.map((app) => A.unfold(app, before.root.child(0)!.ref));

      const node = after.root.child(0);

      expect(node!.thing).toBe("1");
      expect(node!.child(0)!.thing).toBe("2");
      expect(node!.child(0)!.child(0)!.thing).toBe("4");
      expect(node!.child(1)!.thing).toBe("3");
      expect(node!.child(1)!.child(0)!.thing).toBe("5");
    });
  });

  describe("when the outline contains loops", () => {
    const before = W.of({
      "0": {content: [], children: ["1"]},
      "1": {content: [], children: ["2"]},
      "2": {content: [], children: ["0"]},
    });

    it("doesn't unfold the past the root", () => {
      const after = before.map((app) => A.unfold(app, before.root.child(0)!.ref));
      const node = after.root.child(0);

      expect(node!.thing).toBe("1");
      expect(node!.child(0)!.thing).toBe("2");
      expect(node!.child(0)!.child(0)!.thing).toBe("0");
      expect(node!.child(0)!.child(0)!.child(0)!.thing).toBe("1");
      expect(node!.child(0)!.child(0)!.child(0)!.expanded).toBe(false);
    });
  });
});
