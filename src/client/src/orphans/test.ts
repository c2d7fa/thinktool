/// <reference types="@types/jest" />

import * as Immutable from "immutable";
import * as O from "./core";

function build(items: [O.Id, {}][]): O.Graph {
  return {
    all() {
      return Immutable.Set<O.Id>(items.map((item) => item[0]));
    },

    root() {
      return "0";
    },

    children(item: O.Id) {
      return Immutable.Set<O.Id>();
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
      expect(O.scan(graph)).toEqual(Immutable.Set());
    });
  });

  describe("but there are other items", () => {
    const graph = build([
      ["0", {}],
      ["1", {}],
      ["2", {}],
    ]);

    test("all non-root items are orphans", () => {
      expect(O.scan(graph)).toEqual(Immutable.Set(["1", "2"]));
    });
  });
});
