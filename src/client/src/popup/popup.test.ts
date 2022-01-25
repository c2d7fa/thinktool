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
      expect(opened(after).icon).toEqual("search");
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
