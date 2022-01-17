/// <reference types="@types/jest" />

import * as O from ".";
import * as A from "../app";

function render(items: A.ItemGraph): O.OrphansView {
  return O.view(O.scan(A.of(items)));
}

function contents(view: O.OrphansView): string[] {
  return view.items.map((item) => item.editor.content.join("")).sort();
}

describe("in a graph that consists of two disconnected trees", () => {
  const view = render({
    "0": {children: ["1", "2"]},
    "1": {children: ["3"]},
    "2": {children: ["4"]},
    "3": {},
    "4": {},

    "b0": {children: ["b1", "b2"]},
    "b1": {children: ["b3"]},
    "b2": {children: ["b4"]},
    "b3": {},
    "b4": {},
  });

  test("the orphans are exactly the roots of the disconnected tree", () => {
    expect(contents(view)).toEqual(["Item b0"]);
  });
});

describe("in a graph that consists of a loop connected to the root item", () => {
  const view = render({
    "0": {children: ["1"]},
    "1": {children: ["2"]},
    "2": {children: ["3"]},
    "3": {children: ["0"]},
  });

  test("there are no orphans", () => {
    expect(contents(view)).toEqual([]);
  });
});

describe("in a graph that consists of a disconnected loop", () => {
  const view = render({
    "0": {children: []},
    "1": {children: ["2"]},
    "2": {children: ["3"]},
    "3": {children: ["1"]},
  });

  test("there is exactly one orphan", () => {
    expect(contents(view).length).toEqual(1);
  });

  test("all orphans are in the unrooted tree", () => {
    expect(
      contents(view)
        .map((item) => ["Item 1", "Item 2", "Item 3"].includes(item))
        .reduce((a, b) => a && b),
    ).toBe(true);
  });
});

test("creating an item and then removing it adds it to the inbox", () => {
  let app = A.of({});
  app = A.update(app, {type: "focus", id: A.outline(app).root.id});
  app = A.update(app, {type: "action", action: "new-child"});
  app = A.update(app, {
    type: "edit",
    tag: "edit",
    focused: true,
    editor: {content: ["Added item"], selection: {from: 0, to: 0}},
  });
  app = A.update(app, {type: "action", action: "remove"});
  app = A.update(app, {type: "action", action: "view-orphans"});

  expect(O.view(app).items).toMatchObject([
    {kind: "root", status: "terminal", editor: {content: ["Added item"]}, children: []},
  ]);
});
