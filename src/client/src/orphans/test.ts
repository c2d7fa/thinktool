/// <reference types="@types/jest" />

import * as Immutable from "immutable";
import * as O from "./core";

function build(items: [O.Id, {children?: O.Id[]}][]): O.Graph {
  return {
    all() {
      return Immutable.Set<O.Id>(items.map((item) => item[0]));
    },

    root() {
      return "0";
    },

    children(id: O.Id) {
      const item = items.find((item) => item[0] === id);
      if (item === undefined || item[1].children === undefined) return Immutable.Set<O.Id>();
      return Immutable.Set<O.Id>(item[1].children);
    },

    links(item: O.Id) {
      return Immutable.Set<O.Id>();
    },

    parents(item: O.Id) {
      return Immutable.Set<O.Id>();
    },

    references(item: O.Id) {
      return Immutable.Set<O.Id>();
    },
  };
}

describe("when the root isn't connected to any items", () => {
  describe("and there are no other items", () => {
    const graph = build([]);

    test("there are no orphans", () => {
      expect(O.ids(O.scan(graph))).toEqual(Immutable.Set());
    });
  });

  describe("but there are other items", () => {
    const graph = build([
      ["0", {}],
      ["1", {}],
      ["2", {}],
    ]);

    test("all non-root items are orphans", () => {
      expect(O.ids(O.scan(graph))).toEqual(Immutable.Set(["1", "2"]));
    });
  });
});

describe("in a graph that consists of two disconnected trees", () => {
  const graph = build([
    ["0", {children: ["1", "2"]}],
    ["1", {children: ["3"]}],
    ["2", {children: ["4"]}],
    ["3", {}],
    ["4", {}],

    ["b0", {children: ["b1", "b2"]}],
    ["b1", {children: ["b3"]}],
    ["b2", {children: ["b4"]}],
    ["b3", {}],
    ["b4", {}],
  ]);

  test("the orphans are exactly the items in the unrooted tree", () => {
    expect(O.ids(O.scan(graph))).toEqual(Immutable.Set(["b0", "b1", "b2", "b3", "b4"]));
  });
});

describe("in a graph that consists of a loop", () => {
  const graph = build([
    ["0", {children: ["1"]}],
    ["1", {children: ["2"]}],
    ["2", {children: ["3"]}],
    ["3", {children: ["0"]}],
  ]);

  test("there are no orphans", () => {
    expect(O.ids(O.scan(graph))).toEqual(Immutable.Set([]));
  });
});
