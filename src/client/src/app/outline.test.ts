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
