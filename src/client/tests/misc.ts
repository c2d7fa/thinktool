import * as D from "../src/data";
import * as T from "../src/tree";
import * as C from "../src/context";
import * as Tu from "../src/tutorial";

export function appState(data: D.State, tree: T.Tree): C.AppState {
  return {
    state: data,
    tree: tree,
    selectedThing: T.thing(tree, T.root(tree)),
    tutorialState: Tu.initialize(false),
    changelogShown: false,
    changelog: "loading",
    drag: {current: null, target: null, finished: false},
  };
}
