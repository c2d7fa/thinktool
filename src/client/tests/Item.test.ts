/// <reference types="@types/jest" />

import * as Item from "../src/ui/Item";

import {appState} from "./misc";

import * as D from "../src/data";
import * as T from "../src/tree";

/// <reference types="@types/jest" />

describe("item status", () => {
  test("a node with no connections except from its parent is terminal", () => {
    let state = D.addChild(D.empty, "0", "child")[0];
    let tree = T.fromRoot(state, "0");

    const node = T.children(tree, T.root(tree))[0];
    expect(T.thing(tree, node)).toBe("child");

    expect(Item.status(tree, node)).toBe("terminal");
  });

  test("an item that has no connections except from two parents is terminal", () => {
    let state = D.empty;
    state = D.addChild(state, "0", "item")[0];
    state = D.addChild(D.create(state, "parent")[0], "parent", "item")[0];

    let tree = T.fromRoot(state, "0");

    const node = T.children(tree, T.root(tree))[0];
    expect(T.thing(tree, node)).toBe("item");

    expect(Item.status(tree, node)).toBe("terminal");
  });

  describe("an item that is referenced from somewhere else", () => {
    let state = D.empty;
    [state] = D.addChild(state, "0", "item");
    state = D.setContent(D.create(state, "ref")[0], "ref", [{link: "item"}]);

    let tree = T.fromRoot(state, "0");

    const node = T.children(tree, T.root(tree))[0];
    expect(T.thing(tree, node)).toBe("item");

    test("starts out collapsed", () => {
      expect(Item.status(tree, node)).toBe("collapsed");
    });

    test("can be expanded", () => {
      tree = T.toggle(state, tree, node);
      expect(Item.status(tree, node)).toBe("expanded");
    });
  });
});

describe("clicking on an item's bullet", () => {
  describe("if the item is an opened link", () => {
    let data = D.empty;
    data = D.create(data, "1")[0];
    data = D.create(data, "2")[0];
    data = D.setContent(data, "2", ["This is a linked item."]);
    data = D.setContent(data, "1", ["This item has a link to ", {link: "2"}, "."]);
    data = D.addChild(data, "0", "1")[0];

    let tree = T.fromRoot(data, "0");
    const node = () => T.children(tree, T.root(tree))[0];

    expect(T.thing(tree, node())).toBe("1");
    expect(T.isLinkOpen(tree, node(), "2")).toBe(false);

    tree = T.toggleLink(data, tree, node(), "2");
    expect(T.isLinkOpen(tree, node(), "2")).toBe(true);

    it("a normal click closes the link", () => {
      let app = appState(data, tree);
      const linking = () => T.children(tree, T.root(tree))[0];

      expect(T.thing(tree, linking())).toBe("1");
      expect(T.isLinkOpen(app.tree, linking(), "2")).toBe(true);

      const linked = T.openedLinksChildren(tree, linking())[0];
      expect(T.thing(tree, linked)).toBe("2");

      app = Item.click(app, linked);

      expect(T.thing(tree, linking())).toBe("1");
      expect(T.isLinkOpen(app.tree, linking(), "2")).toBe(false);
    });

    it("an alt-click jumps to the linked item", () => {
      let app = appState(data, tree);
      const linking = () => T.children(tree, T.root(tree))[0];

      expect(T.thing(tree, linking())).toBe("1");
      expect(T.isLinkOpen(app.tree, linking(), "2")).toBe(true);

      const selected = () => T.thing(app.tree, T.root(app.tree));
      expect(selected()).toBe("0");

      const linked = T.openedLinksChildren(tree, linking())[0];
      expect(T.thing(tree, linked)).toBe("2");

      app = Item.altClick(app, linked);

      expect(selected()).toBe("2");
    });
  });

  describe("if the item is a normal child item", () => {
    it.todo("if it doesn't have children, it's still collapsed after a normal click");
    it.todo("if it has children, a normal click expands the item");
    it.todo("another normal click collapses the item again");
    it.todo("an alt-click jumps to the item");
  });

  describe("if the item is a parent", () => {
    it.todo("a normal click jumps to the item");
  });
});
