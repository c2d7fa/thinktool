/// <reference types="@types/jest" />

import * as A from ".";
import {construct} from "./test-utils";

describe("in an outline where the root item is referenced by another item", () => {
  const base = construct({id: "root", content: "The root item"}, [
    {id: "another", content: ["This item links to ", {link: "root"}, "."]},
  ]);

  const baseOutline = A.view(base) as A.Outline;

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
  const baseOutline = A.view(base) as A.Outline;

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
    const afterFocusOutline = A.view(afterFocus) as A.Outline;

    test("that item becomes focused", () => {
      expect(afterFocusOutline.root.children).toMatchObject([{hasFocus: true}, {hasFocus: false}]);
    });

    describe("after setting the cursor position", () => {
      const focusedItem = afterFocusOutline.root.children.find((c) => c.hasFocus)!;
      const afterCursor = A.update(afterFocus, {
        type: "edit",
        id: focusedItem.id,
        event: {type: "edit", editor: {...focusedItem.editor, selection: {from: 5, to: 5}}, focused: true},
      });

      test("the cursor position is reflected in the outline", () => {
        expect((A.view(afterCursor) as A.Outline).root.children).toMatchObject([
          {editor: {content: ["Item 1"], selection: {from: 5, to: 5}}},
          {editor: {content: ["Item 2"]}},
        ]);
      });

      describe("after moving the item down", () => {
        const focusedId = (A.view(afterCursor) as A.Outline).root.children.find((c) => c.hasFocus)!.id;
        const afterDown = A.update(afterCursor, {
          id: focusedId,
          type: "edit",
          event: {type: "action", action: "down"},
        });

        test("the positions of the items are swapped", () => {
          expect((A.view(afterDown) as A.Outline).root.children).toMatchObject([
            {editor: {content: ["Item 2"]}},
            {editor: {content: ["Item 1"]}},
          ]);
        });

        test("the previously focused item is still focused", () => {
          expect((A.view(afterDown) as A.Outline).root.children).toMatchObject([
            {hasFocus: false},
            {hasFocus: true},
          ]);
        });

        test("the cursor position is still reflected in the outline", () => {
          expect((A.view(afterDown) as A.Outline).root.children).toMatchObject([
            {editor: {content: ["Item 2"]}},
            {editor: {content: ["Item 1"], selection: {from: 5, to: 5}}},
          ]);
        });
      });
    });
  });
});

function updateEditFocused(app: A.App, ...events: (A.Event & {type: "edit"})["event"][]) {
  return events.reduce(
    (app, event) =>
      A.update(app, {
        id: A.focusedId(app)!,
        type: "edit",
        event,
      }),
    app,
  );
}

describe("moving focus with arrow key commands", () => {
  const base = construct({
    children: [{content: "Item 1", children: [{content: "Item 1.1"}]}, {content: "Item 2"}],
  });

  describe("after focusing Item 1 and expanding it", () => {
    const afterFocus = A.update(base, {type: "focus", id: (A.view(base) as A.Outline).root.children[0].id});
    const afterToggle = updateEditFocused(afterFocus, {type: "action", action: "toggle"});

    test("the children of Item 1 are shown", () => {
      expect((A.view(afterToggle) as A.Outline).root.children).toMatchObject([
        {editor: {content: ["Item 1"]}, children: [{editor: {content: ["Item 1.1"]}}]},
        {editor: {content: ["Item 2"]}},
      ]);
    });

    test("the first item still has focus", () => {
      expect((A.view(afterToggle) as A.Outline).root.children).toMatchObject([
        {hasFocus: true, children: [{hasFocus: false}]},
        {hasFocus: false},
      ]);
    });

    describe("after moving focus down", () => {
      const afterFocusDownOnce = updateEditFocused(afterToggle, {type: "action", action: "focus-down"});

      test("focus moves to Item 1.1", () => {
        expect((A.view(afterFocusDownOnce) as A.Outline).root.children).toMatchObject([
          {hasFocus: false, children: [{hasFocus: true}]},
          {hasFocus: false},
        ]);
      });

      describe("after moving focus down again", () => {
        const afterFocusDownTwice = updateEditFocused(afterFocusDownOnce, {type: "action", action: "focus-down"});

        test("focus moves to Item 2", () => {
          expect((A.view(afterFocusDownTwice) as A.Outline).root.children).toMatchObject([
            {hasFocus: false, children: [{hasFocus: false}]},
            {hasFocus: true},
          ]);
        });

        describe("after trying to move focus down again", () => {
          const afterFocusDownThrice = updateEditFocused(afterFocusDownTwice, {
            type: "action",
            action: "focus-down",
          });

          test("focus stays on Item 2", () => {
            expect((A.view(afterFocusDownThrice) as A.Outline).root.children).toMatchObject([
              {hasFocus: false, children: [{hasFocus: false}]},
              {hasFocus: true},
            ]);
          });

          describe("after moving focus back up to Item 1 and toggling it again", () => {
            const afterFocusBackUp = updateEditFocused(
              afterFocusDownThrice,
              {type: "action", action: "focus-up"},
              {type: "action", action: "focus-up"},
              {type: "action", action: "toggle"},
            );

            test("tthe first item is focused again", () => {
              expect((A.view(afterFocusBackUp) as A.Outline).root.children).toMatchObject([
                {hasFocus: true},
                {hasFocus: false},
              ]);
            });

            test("the children of Item 1 are hidden", () => {
              expect((A.view(afterFocusBackUp) as A.Outline).root.children).toMatchObject([
                {editor: {content: ["Item 1"]}, children: []},
                {editor: {content: ["Item 2"]}},
              ]);
            });

            describe("after moving focus down again", () => {
              const afterFocusDownAgain = updateEditFocused(afterFocusBackUp, {
                type: "action",
                action: "focus-down",
              });

              test("focus moves directly to Item 2", () => {
                expect((A.view(afterFocusDownAgain) as A.Outline).root.children).toMatchObject([
                  {hasFocus: false},
                  {hasFocus: true},
                ]);
              });
            });
          });
        });
      });
    });
  });
});
