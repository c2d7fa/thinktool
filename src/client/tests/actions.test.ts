/// <reference types="@types/jest" />

import * as C from "../src/context";
import * as S from "../src/storage";
import * as D from "../src/data";
import * as Tu from "../src/tutorial";
import * as T from "../src/tree";

import * as A from "../src/actions";

function useState<T>(initial: T): [() => T, (x: T) => void, (f: (x: T) => T) => void] {
  let value = initial;

  function get() {
    return value;
  }

  function set(newValue: T) {
    value = newValue;
  }

  function update(f: (x: T) => T) {
    set(f(value));
  }

  return [get, set, update];
}

function newContext(): C.Context {
  let [getState, setState, updateState] = useState(D.empty);
  let [getTutorialState, setTutorialState] = useState(Tu.initialize(false));
  let [getTree, setTree] = useState(T.fromRoot(getState(), "0"));
  let [getSelectedThing, setSelectedThing] = useState("0");

  return {
    storage: S.ignore(),

    get state() {
      return getState();
    },
    setState,
    setLocalState: setState,
    updateLocalState: updateState,

    get tutorialState() {
      return getTutorialState();
    },
    setTutorialState,

    changelogShown: false,
    setChangelogShown() {},
    changelog: "loading",

    undo() {},

    get tree() {
      return getTree();
    },
    setTree,

    drag: {current: null, target: null, finished: false},
    setDrag() {},

    get selectedThing() {
      return getSelectedThing();
    },
    setSelectedThing,

    activePopup: () => null,
    setActivePopup: () => {},
    popupTarget: null,
    setPopupTarget: () => {},

    selectionInFocusedContent: null,
    setSelectionInFocusedContent: () => {},
  };
}

describe.each(["find", "new"] as A.ActionName[])("an action that is always enabled", (action) => {
  it("is enabled even when no node is focused", () => {
    expect(A.enabled(newContext(), action)).toBe(true);
  });

  it("is also enabled when a node is focused", () => {
    const context = newContext();
    context.setTree(T.focus(context.tree, T.root(context.tree)));
    expect(A.enabled(context, action)).toBe(true);
  });
});

describe.each(["insert-sibling", "zoom", "indent", "new-child", "remove"] as A.ActionName[])(
  "an action that requires a target",
  (action) => {
    it("is disabled when no node is focused", () => {
      expect(A.enabled(newContext(), action)).toBe(false);
    });

    it("is enabled when a node is focused", () => {
      const context = newContext();
      context.setTree(T.focus(context.tree, T.root(context.tree)));
      expect(A.enabled(context, action)).toBe(true);
    });
  },
);
