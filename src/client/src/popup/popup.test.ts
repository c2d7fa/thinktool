/// <reference types="@types/jest" />

import * as A from "../app";
import * as T from "../tree";
import * as E from "../editing";
import * as P from ".";

describe("when opening popup while text is selected", () => {
  let app = A.of({
    "0": {content: ["Root item"], children: ["1", "2"]},
    "1": {content: ["This item references Another item."]},
    "2": {content: ["Another item"]},
  });

  // Focus item "1"
  app = A.merge(app, {tree: T.focus(app.tree, T.children(app.tree, T.root(app.tree))[0])});
  const node = T.focused(app.tree);
  expect(node && T.thing(app.tree, node)).toBe("1");
  if (!node) throw "logic error";

  // Select the text "Another item":
  app = A.edit(app, node, E.select(A.editor(app, node)!, {from: 21, to: 33}));
  expect(A.selectedText(app)).toBe("Another item");

  // Open a popup:
  const result = A.openPopup(app, (app) => app);
  app = result.app;

  // Simulate search:
  app = A.merge(app, {
    popup: P.receiveResults(
      app.popup,
      app.state,
      result.search.items.filter((item) => item.content.startsWith(result.search.query)).map((r) => r.thing),
    ),
  });

  test("that text is inserted as the query in the popup", () => {
    expect(P.query(app.popup)).toBe("Another item");
  });

  test("results are popuplated", () => {
    expect(P.results(app.popup).length).toBe(1);
  });

  test("the first match is selected", () => {
    expect(P.isThingActive(app.popup, "2")).toBe(true);
  });
});
