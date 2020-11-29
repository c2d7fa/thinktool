/// <reference types="@types/jest" />

import * as C from "../src/context";
import * as D from "../src/data";
import * as Tu from "../src/tutorial";
import * as T from "../src/tree";

import * as A from "../src/actions";

function appState(data: D.State, tree: T.Tree): C.AppState {
  return {
    state: data,
    tree: tree,
    selectedThing: T.thing(tree, T.root(tree)),
    tutorialState: Tu.initialize(true),
    changelogShown: false,
    changelog: "loading",
    drag: {current: null, target: null, finished: false},
  };
}

describe.each(["find", "new"] as A.ActionName[])("an action that is always enabled", (action) => {
  let data_ = D.empty;
  data_ = D.addChild(data_, "0", "1")[0];
  let tree_ = T.fromRoot(data_, "0");

  it("is enabled even when no node is focused", () => {
    expect(A.enabled(appState(data_, tree_), action)).toBe(true);
  });

  it("is also enabled when a node is focused", () => {
    let tree = T.focus(tree_, T.children(tree_, T.root(tree_))[0]);
    expect(A.enabled(appState(data_, tree), action)).toBe(true);
  });
});

describe.each(["insert-sibling", "zoom", "indent", "new-child", "remove"] as A.ActionName[])(
  "an action that requires a target",
  (action) => {
    let data_ = D.empty;
    data_ = D.addChild(data_, "0", "1")[0];
    let tree_ = T.fromRoot(data_, "0");

    it("is disabled when no node is focused", () => {
      expect(A.enabled(appState(data_, tree_), action)).toBe(false);
    });

    it("is enabled when a node is focused", () => {
      let tree = T.focus(tree_, T.children(tree_, T.root(tree_))[0]);
      expect(A.enabled(appState(data_, tree), action)).toBe(true);
    });
  },
);
