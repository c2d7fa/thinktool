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

describe("a graph with mulitple unconnected items", () => {
  const state = (() => {
    let state = D.empty;

    state = D.create(state, "1")[0];
    state = D.create(state, "2")[0];

    state = D.setContent(state, "0", ["Root Item"]);
    state = D.setContent(state, "1", ["Item 1"]);
    state = D.setContent(state, "2", ["Item 2"]);

    return state;
  })();

  const graph = I.fromState(state);

  it("contains items with content corresponding to the underlying state", () => {
    expect(graph.all().map(graph.textContent)).toEqual(Immutable.Set(["Root Item", "Item 1", "Item 2"]));
  });
});

describe("when an item has a child", () => {
  const state = (() => {
    let state = D.empty;

    state = D.create(state, "1")[0];

    state = D.setContent(state, "0", ["Root Item"]);
    state = D.setContent(state, "1", ["Item 1"]);

    state = D.addChild(state, "0", "1")[0];

    return state;
  })();

  const graph = I.fromState(state);

  test("the parent knows about the child", () => {
    expect(graph.children(graph.root()).map(graph.textContent)).toEqual(Immutable.Set(["Item 1"]));
  });

  test("the child knows about the parent", () => {
    const child = graph.children(graph.root()).toArray()[0];
    expect(graph.parents(child).map(graph.textContent)).toEqual(Immutable.Set(["Root Item"]));
  });
});

describe("when an item links to another item", () => {
  const state = (() => {
    let state = D.empty;

    state = D.create(state, "1")[0];

    state = D.setContent(state, "0", ["Root Item references ", {link: "1"}]);
    state = D.setContent(state, "1", ["Item 1"]);

    return state;
  })();

  const graph = I.fromState(state);

  test("the graph contains the link", () => {
    expect(graph.links(graph.root()).map(graph.textContent)).toEqual(Immutable.Set(["Item 1"]));
  });

  test("the graph contains the reference", () => {
    const link = graph.links(graph.root()).toArray()[0];
    expect(graph.references(link).map(graph.textContent)).toEqual(Immutable.Set(["Root Item references Item 1"]));
  });
});
