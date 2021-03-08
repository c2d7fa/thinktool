/// <reference types="@types/jest" />

import * as Immutable from "immutable";
import * as D from "../data";
import * as I from "./integration";

describe("a graph that is empty except for the root node", () => {
  const graph = I.fromState(D.setContent(D.empty, "0", ["Root Item"]));

  it("has a root item with no connections", () => {
    const root = graph.root();
    expect(graph.children(root)).toEqual(Immutable.Set());
    expect(graph.parents(root)).toEqual(Immutable.Set());
    expect(graph.links(root)).toEqual(Immutable.Set());
    expect(graph.references(root)).toEqual(Immutable.Set());
  });

  it("has no other items", () => {
    expect(graph.all()).toEqual(Immutable.Set([graph.root()]));
  });

  it("gets its content from the state", () => {
    expect(graph.textContent(graph.root())).toBe("Root Item");
  });
});
