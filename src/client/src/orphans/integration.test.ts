/// <reference types="@types/jest" />

import * as Immutable from "immutable";
import * as D from "../data";
import * as I from "./integration";

describe("an empty graph", () => {
  const graph = I.graph(D.empty);

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
});
