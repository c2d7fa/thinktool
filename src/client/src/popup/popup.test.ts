/// <reference types="@types/jest" />

import * as A from "../app";
import * as P from ".";

describe("when opening popup while text is selected", () => {
  const app = A.after(
    {
      "0": {content: ["Root item"], children: ["1", "2"]},
      "1": {content: ["This item references Another item."]},
      "2": {content: ["Another item"]},
    },
    [
      (view) => ({type: "focus", id: (view as A.Outline).root.children[0].id}),
      (view) => ({
        type: "edit",
        id: (view as A.Outline).root.children[0].id,
        editor: {selection: {from: 21, to: 33}},
      }),
    ],
  );

  test("the expected text is selected", () => {
    expect(A.selectedText(app)).toEqual("Another item");
  });

  describe("after searching for an item", () => {
    const after = A.after(app, [{type: "action", action: "find"}]);

    function opened(app: A.App): P.View & {open: true} {
      return A.view(app).popup as P.View & {open: true};
    }

    test("the popup has the search icon", () => {
      expect(opened(after).icon).toEqual("find");
    });

    test("the selected text is inserted as the query in the popup", () => {
      expect(opened(after)).toMatchObject({query: "Another item"});
    });

    test("results are popuplated", () => {
      expect(opened(after).results).toMatchObject([{content: ["Another item"]}]);
    });

    test("the first match is selected", () => {
      expect(opened(after).results).toMatchObject([{isSelected: true}]);
    });
  });
});

describe("searching for and selecting an item", () => {
  const app = A.after(
    {
      "0": {content: ["Root item"], children: ["1", "2"]},
      "1": {content: ["Some item"]},
      "2": {content: ["Another item"]},
    },
    [(view) => ({type: "focus", id: (view as A.Outline).root.children[0].id})],
  );

  describe("at first", () => {
    test("the popup is closed", () => {
      expect(A.view(app).popup).toMatchObject({open: false});
    });

    test("the root item has two children", () => {
      expect((A.view(app) as A.Outline).root.children).toHaveLength(2);
    });
  });

  const afterOpeningPopup = A.after(app, [{type: "action", action: "insert-sibling"}]);

  describe("after triggering the 'insert sibling' action", () => {
    test("the popup is shown", () => {
      expect(A.view(afterOpeningPopup).popup).toMatchObject({open: true});
    });

    test("the query text is empty", () => {
      expect(A.view(afterOpeningPopup).popup).toMatchObject({query: ""});
    });
  });

  const afterQuery = A.after(afterOpeningPopup, [{topic: "popup", type: "query", query: "Another item"}]);

  describe("after searching for an item", () => {
    test("the query text is updated", () => {
      expect(A.view(afterQuery).popup).toMatchObject({query: "Another item"});
    });

    test("the matching item is the first result", () => {
      expect(A.view(afterQuery).popup).toMatchObject({results: [{content: ["Another item"], isSelected: true}]});
    });
  });

  const afterSelecting = A.after(afterQuery, [{topic: "popup", type: "select"}]);

  describe("after selecting an item", () => {
    test("the popup is closed", () => {
      expect(A.view(afterSelecting).popup).toMatchObject({open: false});
    });

    test("the selected item is inserted as a sibling", () => {
      expect((A.view(afterSelecting) as A.Outline).root.children.map((ch) => ch.editor.content)).toEqual([
        ["Some item"],
        ["Another item"],
        ["Another item"],
      ]);
    });

    test("the newly inserted item has focus", () => {
      expect((A.view(afterSelecting) as A.Outline).root.children.map((ch) => ch.hasFocus)).toEqual([
        false,
        true,
        false,
      ]);
    });
  });
});
