/// <reference types="@types/jest" />

import * as W from "../wrapap";
import * as A from ".";
import * as Ou from "./outline";

describe("when an item with a reference is selected", () => {
  let w = W.of({"0": {content: ["This item links to ", {link: "1"}, "."]}, "1": {content: ["Item 1"]}});
  w = w.map((a) => A.jump(a, "1"));

  const outline = Ou.fromApp(w.app);

  test("the in-line references of the root data item is never shown", () => {
    expect(outline.root.references).toEqual({state: "empty"});
  });

  test("the references section in the outline shows that reference", () => {
    expect(outline.references.state).toEqual("expanded");
    if (outline.references.state !== "expanded") throw undefined;
    expect(outline.references.items[0].editor.content).toEqual([
      "This item links to ",
      {link: "1", title: "Item 1"},
      ".",
    ]);
  });
});

describe("in an app with two items", () => {
  const base = W.of({
    "0": {children: ["1", "2"], content: []},
    "1": {content: ["Item 1"]},
    "2": {content: ["Item 2"]},
  }).app;

  const baseOutline = A.outline(base);

  test("the items appear in the outline", () => {
    expect(baseOutline.root.children).toMatchObject([
      {editor: {content: ["Item 1"]}},
      {editor: {content: ["Item 2"]}},
    ]);
  });

  test("no items are focused", () => {
    expect(baseOutline.root.children).toMatchObject([{hasFocus: false}, {hasFocus: false}]);
  });

  describe("after focusing the first item", () => {
    const afterFocus = A.outline(A.update(base, {type: "focus", id: baseOutline.root.children[0].id}));

    test("that item becomes focused", () => {
      expect(afterFocus.root.children).toMatchObject([{hasFocus: true}, {hasFocus: false}]);
    });
  });
});
