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

  test("the orphans are exactly the items in the unrooted tree", () => {
    expect(contents(view)).toEqual(["Item b0", "Item b1", "Item b2", "Item b3", "Item b4"]);
  });
});

describe("in a graph that consists of a loop", () => {
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
