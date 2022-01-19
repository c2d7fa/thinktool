/// <reference types="@types/jest" />

import * as A from "../app";
import * as E from "../editor";
import * as P from ".";

describe("when opening popup while text is selected", () => {
  let app = A.of({
    "0": {content: ["Root item"], children: ["1", "2"]},
    "1": {content: ["This item references Another item."]},
    "2": {content: ["Another item"]},
  });

  // Focus item "1"
  app = A.update(app, {type: "focus", id: (A.view(app) as A.Outline).root.children[0].id});
  const item = (A.view(app) as A.Outline).root.children[0];

  // Select the text "Another item":
  app = A.edit(app, item, E.select(A.editor(app, item)!, {from: 21, to: 33}));
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
