/// <reference types="@types/jest" />

import * as W from "./wrapap";

describe("initializing app from scratch with 'of'", () => {
  const wpp = W.of({
    "0": {content: ["Item 0"], children: ["1", "2"]},
    "1": {content: ["Item 1 with link to ", {link: "0"}]},
    "2": {content: ["Item 2"], children: ["2"]},
  });

  test("zooms in on the item with ID '0'", () => {
    expect(wpp.root.thing).toEqual("0");
  });

  test("sets the content of each item", () => {
    expect(wpp.root.content).toEqual(["Item 0"]);
    expect(wpp.root.child(0)?.content).toEqual(["Item 1 with link to ", {link: "0", title: "Item 0"}]);
    expect(wpp.root.child(1)?.content).toEqual(["Item 2"]);
  });
});

describe("after jumping to an item by middle clicking its bullet", () => {
  const before = W.of({
    "0": {content: ["Item 0"], children: ["1"]},
    "1": {content: ["Item 1"]},
  });

  const after = before.send({type: "click-bullet", id: before.root.child(0)!.ref.id, alt: true});

  test("the root item is updated", () => {
    expect(before.root.thing).toBe("0");
    expect(after.root.thing).toBe("1");
  });

  test("the 'jump-item' goal is completed", () => {
    expect(before.completed("jump-item")).toBe(false);
    expect(after.completed("jump-item")).toBe(true);
  });
});

describe("when toggling a link", () => {
  const initial = W.of({
    "0": {content: ["This item has a link to ", {link: "1"}, "."]},
    "1": {content: ["Another Item"]},
  });

  const expanded = initial.root.toggleLink("1");

  const collapsed = expanded.root.toggleLink("1");

  describe("when the link is first toggled", () => {
    test("the linked item is added as an opened link", () => {
      expect(initial.root.openedLinks.length).toBe(0);
      expect(expanded.root.openedLinks.length).toBe(1);
    });

    test("the 'expand-link' goal is completed", () => {
      expect(initial.completed("expand-link")).toBe(false);
      expect(expanded.completed("expand-link")).toBe(true);
    });
  });

  describe("when the link is collapsed", () => {
    test("the linked item is removed", () => {
      expect(expanded.root.openedLinks.length).toBe(1);
      expect(collapsed.root.openedLinks.length).toBe(0);
    });

    test("the goal remains completed", () => {
      expect(expanded.completed("expand-link")).toBe(true);
      expect(collapsed.completed("expand-link")).toBe(true);
    });
  });
});

describe("inserting a link in an editor", () => {
  const before = W.of({
    "0": {content: ["This is item 0."]},
    "1": {content: ["This is item 1."]},
  }).root.edit({selection: {from: 8, to: 14}});

  const after = before.send(
    {type: "action", action: "insert-link"},
    {topic: "popup", type: "query", query: "This is item 1"},
    {topic: "popup", type: "select"},
  );

  it("updates the content so the selection is replaced with the link", () => {
    expect(before.root.content).toEqual(["This is item 0."]);
    expect(after.root.content).toEqual(["This is ", {link: "1", title: "This is item 1."}, "."]);
  });

  it("sets the selection to be after the inserted link", () => {
    expect(before.selection).toEqual({from: 8, to: 14});
    expect(after.selection).toEqual({from: 9, to: 9});
  });
});

describe("after creating a new child", () => {
  const before = W.of({
    "0": {content: ["Item 0"]},
  });

  const after = before.root.edit().send({type: "action", action: "new-child"});

  test("the parent item gets a new child", () => {
    expect(before.root.nchildren).toBe(0);
    expect(after.root.nchildren).toBe(1);
  });

  test("the child is focused", () => {
    expect(after.focused?.thing).toEqual(after.root.child(0)?.thing);
  });
});

describe("unfolding an item", () => {
  describe("when the item has no children", () => {
    const before = W.of({
      "0": {content: []},
    });

    const after = before.root.edit().send({type: "action", action: "unfold"});

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

      const after = before.root.child(0)!.edit().send({type: "action", action: "unfold"});

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

      const after = before.root.child(0)!.edit().send({type: "action", action: "unfold"});

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
      const after = before.root.child(0)!.edit().send({type: "action", action: "unfold"});
      const node = after.root.child(0);

      expect(node!.thing).toBe("1");
      expect(node!.child(0)!.thing).toBe("2");
      expect(node!.child(0)!.child(0)!.thing).toBe("0");
      expect(node!.child(0)!.child(0)!.child(0)!.thing).toBe("1");
      expect(node!.child(0)!.child(0)!.child(0)!.expanded).toBe(false);
    });
  });
});
