/// <reference types="@types/jest" />

import * as A from "../app";
import {expectViewToMatch} from "../app/test-utils";

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
    test("the popup has the search icon", () => {
      expectViewToMatch(after, {popup: {icon: "find"}});
    });

    test("the selected text is inserted as the query in the popup", () => {
      expectViewToMatch(after, {popup: {query: "Another item"}});
    });

    test("results are popuplated", () => {
      expectViewToMatch(after, {popup: {results: [{content: ["Another item"]}]}});
    });

    test("the first match is selected", () => {
      expectViewToMatch(after, {popup: {results: [{isSelected: true}]}});
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
      expectViewToMatch(app, {
        root: {children: [{editor: {content: ["Some item"]}}, {editor: {content: ["Another item"]}}]},
      });
    });
  });

  const afterOpeningPopup = A.after(app, [{type: "action", action: "insert-sibling"}]);

  describe("after triggering the 'insert sibling' action", () => {
    test("the popup is shown", () => {
      expectViewToMatch(afterOpeningPopup, {popup: {open: true}});
    });

    test("the query text is empty", () => {
      expectViewToMatch(afterOpeningPopup, {popup: {query: ""}});
    });
  });

  const afterQuery = A.after(afterOpeningPopup, [{topic: "popup", type: "query", query: "Another item"}]);

  describe("after searching for an item", () => {
    test("the query text is updated", () => {
      expectViewToMatch(afterQuery, {popup: {query: "Another item"}});
    });

    test("the matching item is the first result", () => {
      expectViewToMatch(afterQuery, {popup: {results: [{content: ["Another item"], isSelected: true}]}});
    });
  });

  const afterSelecting = A.after(afterQuery, [{topic: "popup", type: "select"}]);

  describe("after selecting an item", () => {
    test("the popup is closed", () => {
      expectViewToMatch(afterSelecting, {popup: {open: false}});
    });

    test("the selected item is inserted as a sibling and gains focus", () => {
      expectViewToMatch(afterSelecting, {
        root: {
          children: [
            {editor: {content: ["Some item"]}, hasFocus: false},
            {editor: {content: ["Another item"]}, hasFocus: true},
            {editor: {content: ["Another item"]}, hasFocus: false},
          ],
        },
      });
    });
  });
});
