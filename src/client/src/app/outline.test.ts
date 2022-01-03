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
    const afterFocus = A.update(base, {type: "focus", id: baseOutline.root.children[0].id});
    const afterFocusOutline = A.outline(afterFocus);

    test("that item becomes focused", () => {
      expect(afterFocusOutline.root.children).toMatchObject([{hasFocus: true}, {hasFocus: false}]);
    });

    describe("after setting the cursor position", () => {
      const focusedItem = afterFocusOutline.root.children.find((c) => c.hasFocus)!;
      const afterCursor = A.update(afterFocus, {
        type: "item",
        event: {
          id: focusedItem.id,
          type: "edit",
          event: {tag: "edit", editor: {...focusedItem.editor, selection: {from: 5, to: 5}}, focused: true},
        },
      });

      test("the cursor position is reflected in the outline", () => {
        expect(A.outline(afterCursor).root.children).toMatchObject([
          {editor: {content: ["Item 1"], selection: {from: 5, to: 5}}},
          {editor: {content: ["Item 2"]}},
        ]);
      });

      describe("after moving the item down", () => {
        const focusedId = A.outline(afterCursor).root.children.find((c) => c.hasFocus)!.id;
        const afterDown = A.update(afterCursor, {
          type: "item",
          event: {id: focusedId, type: "edit", event: {tag: "action", action: "down"}},
        });

        test("the positions of the items are swapped", () => {
          expect(A.outline(afterDown).root.children).toMatchObject([
            {editor: {content: ["Item 2"]}},
            {editor: {content: ["Item 1"]}},
          ]);
        });

        test("the previously focused item is still focused", () => {
          expect(A.outline(afterDown).root.children).toMatchObject([{hasFocus: false}, {hasFocus: true}]);
        });

        // Bug: Cursor position is currently *not* preserved across moves
        test.skip("the cursor position is still reflected in the outline", () => {
          expect(A.outline(afterDown).root.children).toMatchObject([
            {editor: {content: ["Item 2"]}},
            {editor: {content: ["Item 1"], selection: {from: 5, to: 5}}},
          ]);
        });
      });
    });
  });
});
