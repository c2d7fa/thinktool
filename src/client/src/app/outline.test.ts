/// <reference types="@types/jest" />

import * as A from ".";
import {construct} from "./test-utils";

describe("in an outline where the root item is referenced by another item", () => {
  const base = construct({id: "root", content: "The root item"}, [
    {id: "another", content: ["This item links to ", {link: "root"}, "."]},
  ]);

  const baseOutline = A.outline(base);

  test("the in-line references of the root data item is never shown", () => {
    expect(baseOutline.root).toMatchObject({references: {state: "empty"}});
  });

  test("the references section in the outline shows that reference", () => {
    expect(baseOutline).toMatchObject({
      references: {
        state: "expanded",
        items: [{editor: {content: ["This item links to ", {link: "root", title: "The root item"}, "."]}}],
      },
    });
  });
});

describe("in an app with two items", () => {
  const base = construct({children: [{content: "Item 1"}, {content: "Item 2"}]});
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
