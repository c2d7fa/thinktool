/// <reference types="@types/jest" />

import * as O from ".";
import * as D from "../data";

function build(items: [string, {children?: string[]; links?: string[]}][]): D.State {
  let state = D.empty;

  for (const [id] of items) {
    state = D.create(state, id)[0];
  }

  for (const [id, props] of items) {
    if (props.children) for (const child of props.children) state = D.addChild(state, id, child)[0];

    if (props.links)
      state = D.setContent(
        state,
        id,
        props.links.map((link) => ({link})),
      );
  }

  return state;
}

function render(items: [string, {children?: string[]; links?: string[]}][]): O.OrphansView {
  return O.view(build(items), O.scan(build(items)));
}

describe("when the root isn't connected to any items", () => {
  describe("and there are no other items", () => {
    const view = render([]);

    test("there are no orphans", () => {
      expect(new Set(view.items)).toMatchObject(new Set([]));
    });
  });

  describe("but there are other items", () => {
    const view = render([
      ["0", {}],
      ["1", {}],
      ["2", {}],
    ]);

    test("all non-root items are orphans", () => {
      expect(new Set(view.items.map((i) => i.thing))).toEqual(new Set(["1", "2"]));
    });
  });
});

describe("in a graph that consists of two disconnected trees", () => {
  const view = render([
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
    expect(new Set(view.items.map((i) => i.thing))).toEqual(new Set(["b0", "b1", "b2", "b3", "b4"]));
  });
});

describe("in a graph that consists of a loop", () => {
  const view = render([
    ["0", {children: ["1"]}],
    ["1", {children: ["2"]}],
    ["2", {children: ["3"]}],
    ["3", {children: ["0"]}],
  ]);

  test("there are no orphans", () => {
    expect(new Set(view.items.map((i) => i.thing))).toEqual(new Set([]));
  });
});

describe("in a graph with two components connected through child and link connections", () => {
  const view = render([
    ["0", {children: ["1"]}],
    ["1", {links: ["2"]}],
    ["2", {children: ["3"]}],
    ["3", {links: ["0"]}],

    ["4", {children: ["5"]}],
    ["5", {links: ["6"]}],
    ["6", {children: ["7"]}],
    ["7", {links: ["4"]}],
  ]);

  test("the orphans are exactly the nodes in the graph that does not contain the root item", () => {
    expect(new Set(view.items.map((i) => i.thing))).toEqual(new Set(["4", "5", "6", "7"]));
  });
});
