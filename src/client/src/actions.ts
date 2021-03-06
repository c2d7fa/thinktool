import * as T from "./tree";
import * as P from "./popup";
import * as Tutorial from "./tutorial";
import * as S from "./shortcuts";
import * as Goal from "./goal";
import {NodeRef} from "./tree";
import {App} from "./app";
import * as A from "./app";

export type ActionName =
  | "insert-sibling"
  | "insert-child"
  | "insert-parent"
  | "insert-link"
  | "replace"
  | "find"
  | "new"
  | "new-before"
  | "focus-up"
  | "focus-down"
  | "zoom"
  | "indent"
  | "unindent"
  | "down"
  | "up"
  | "new-child"
  | "remove"
  | "destroy"
  | "tutorial"
  | "changelog"
  | "undo"
  | "toggle"
  | "home"
  | "forum"
  | "unfold"
  | "view-outline"
  | "view-orphans";

// Some actions can only be executed under some circumstances, for example if an
// item is selected.
//
// If enabled(context, action) returns false, then the toolbar button for the
// given action should be disabled, and pressing the shortcut should not execute
// the action.
export function enabled(state: App, action: ActionName): boolean {
  const alwaysEnabled: ActionName[] = ["find", "new", "changelog", "undo", "home", "forum"];
  const requireTarget: ActionName[] = [
    "zoom",
    "new-child",
    "remove",
    "destroy",
    "unindent",
    "indent",
    "up",
    "down",
    "insert-child",
    "insert-sibling",
    "insert-parent",
    "insert-link",
    "replace",
    "new-before",
    "focus-up",
    "focus-down",
    "toggle",
    "unfold",
  ];

  if (alwaysEnabled.includes(action)) {
    return true;
  } else if (requireTarget.includes(action)) {
    return T.focused(state.tree) !== null;
  } else if (action === "tutorial") {
    return !Tutorial.isActive(state.tutorialState);
  } else if (action === "view-outline") {
    return state.tab !== "outline";
  } else if (action === "view-orphans") {
    return state.tab !== "orphans";
  } else {
    console.warn("enabled(..., %o): Did not know about action.", action);
    return true;
  }
}

export interface UpdateResult {
  app: App;
  url?: string;
  undo?: boolean;
  search?: {items: {thing: string; content: string}[]; query: string};
}

export function update(app: App, action: keyof typeof updates): UpdateResult {
  if (!enabled(app, action)) {
    console.error("The action %o should not be enabled! Continuing anyway...", action);
  }

  return updateOn(app, action, T.focused(app.tree));
}

function updateOn(app: App, action: keyof typeof updates, target: NodeRef | null): UpdateResult {
  if (!enabled(app, action)) {
    console.warn("The action %o appears not to be enabled.", action);
  }

  return updates[action]({app, target});
}

function require<T>(x: T | null): T {
  if (x === null) {
    throw "A value was unexpectedly null.";
  }
  return x;
}

function applyActionEvent(app: App, event: Goal.ActionEvent): App {
  return A.merge(app, {tutorialState: Tutorial.action(app.tutorialState, event)});
}

type UpdateArgs = {
  app: App;
  target: NodeRef | null;
};

const updates = {
  "unfold"({target, app}: UpdateArgs) {
    return {app: A.unfold(app, require(target))};
  },

  "insert-sibling"({app, target}: UpdateArgs) {
    return A.openPopup(
      app,
      (result, selection) => {
        const [newState, newTree] = T.insertSiblingAfter(result.state, result.tree, require(target), selection);
        return A.merge(result, {state: newState, tree: newTree});
      },
      {icon: "insert"},
    );
  },

  "insert-child"({app, target}: UpdateArgs) {
    return A.openPopup(
      app,
      (result, selection) => {
        const [newState, newTree] = T.insertChild(result.state, result.tree, require(target), selection, 0);
        return A.merge(result, {state: newState, tree: newTree});
      },
      {icon: "insert"},
    );
  },

  "insert-parent"({app, target}: UpdateArgs) {
    return A.openPopup(
      app,
      (result, selection) => {
        const [newState, newTree] = T.insertParent(result.state, result.tree, require(target), selection);
        result = A.merge(result, {state: newState, tree: newTree});
        result = applyActionEvent(result, {
          action: "inserted-parent",
          childNode: require(target),
          newState,
          newTree,
        });
        return result;
      },
      {icon: "insert"},
    );
  },

  "replace"({app, target}: UpdateArgs) {
    if (A.editor(app, require(target))!.content.length !== 0) {
      console.log("Refusing to replace item because it already has content");
      return {app};
    }
    return A.openPopup(
      app,
      (app, selection) => {
        return A.replace(app, require(target), selection);
      },
      {icon: "insert"},
    );
  },

  "new"({app, target}: UpdateArgs) {
    let result = app;
    if (target === null) {
      result = A.createChild(app, T.root(app.tree));
    } else {
      let [newState, newTree, _, newId] = T.createSiblingAfter(app.state, app.tree, target);
      newTree = T.focus(newTree, newId);
      result = A.merge(result, {state: newState, tree: newTree});
    }
    result = applyActionEvent(result, {action: "created-item"});
    return {app: result};
  },

  "new-before"({app, target}: UpdateArgs) {
    const [newState, newTree, _, newId] = T.createSiblingBefore(app.state, app.tree, require(target));
    return {app: applyActionEvent(A.merge(app, {state: newState, tree: newTree}), {action: "created-item"})};
  },

  "focus-up"({app}: UpdateArgs) {
    return {app: A.merge(app, {tree: T.focusUp(app.tree)})};
  },

  "focus-down"({app}: UpdateArgs) {
    return {app: A.merge(app, {tree: T.focusDown(app.tree)})};
  },

  "zoom"({app, target}: UpdateArgs) {
    let result = app;
    result = A.jump(result, T.thing(result.tree, require(target)));
    return {app: result};
  },

  "indent"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.indent(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return {app: result};
  },

  "unindent"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.unindent(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return {app: result};
  },

  "down"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.moveDown(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return {app: result};
  },

  "up"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.moveUp(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return {app: result};
  },

  "new-child"({app, target}: UpdateArgs) {
    const result = A.createChild(app, require(target));
    return {app: applyActionEvent(result, {action: "created-item"})};
  },

  "remove"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.remove(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "removed"});
    return {app: result};
  },

  "destroy"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.removeThing(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "destroy"});
    return {app: result};
  },

  "tutorial"({app}: UpdateArgs) {
    let result = app;
    result = A.merge(result, {tutorialState: Tutorial.reset(result.tutorialState)});
    return {app: result};
  },

  "changelog"({app}: UpdateArgs) {
    return {app: A.merge(app, {changelogShown: !app.changelogShown})};
  },

  "toggle"({app, target}: UpdateArgs) {
    let result = app;
    const newTree = T.toggle(result.state, result.tree, require(target));
    result = A.merge(result, {tree: newTree});
    result = applyActionEvent(result, {action: "toggled-item", newTree, node: require(target)});
    return {app: result};
  },

  "home"({app}: UpdateArgs) {
    let result = app;
    const newTree = T.fromRoot(result.state, "0");
    result = applyActionEvent(result, {action: "home"});
    result = A.merge(result, {tree: newTree});
    return {app: result};
  },

  "find"({app}: UpdateArgs) {
    const previouslyFocused = T.thing(app.tree, T.root(app.tree));
    return A.openPopup(
      app,
      (result, selection) => {
        result = A.jump(result, selection);
        result = applyActionEvent(result, {action: "found", previouslyFocused, thing: selection});
        return result;
      },
      {icon: "search"},
    );
  },

  "insert-link"({app, target}: UpdateArgs) {
    return A.openPopup(
      app,
      (result, selection) => {
        result = applyActionEvent(result, {action: "link-inserted"});
        result = A.editInsertLink(result, require(target), selection);
        return result;
      },
      {icon: "link"},
    );
  },

  "undo"({app}: UpdateArgs) {
    return {app, undo: true};
  },

  "forum"({app}: UpdateArgs) {
    return {app, url: "https://old.reddit.com/r/thinktool/"};
  },

  "view-outline"({app}: UpdateArgs) {
    return {app: A.switchTab(app, "outline")};
  },

  "view-orphans"({app}: UpdateArgs) {
    return {app: A.switchTab(app, "orphans")};
  },
};

export function shortcut(action: ActionName): S.Shortcut {
  switch (action) {
    case "find":
      return {mod: true, key: "f"};
    case "indent":
      return {mod: true, secondaryMod: true, key: "ArrowRight"};
    case "unindent":
      return {mod: true, secondaryMod: true, key: "ArrowLeft"};
    case "up":
      return {mod: true, secondaryMod: true, key: "ArrowUp"};
    case "down":
      return {mod: true, secondaryMod: true, key: "ArrowDown"};
    case "new-child":
      return {mod: true, key: "Enter"};
    case "remove":
      return {mod: true, key: "Backspace"};
    case "destroy":
      return {mod: true, key: "Delete"};
    case "insert-child":
      return {mod: true, key: "c"};
    case "insert-parent":
      return {mod: true, key: "p"};
    case "insert-sibling":
      return {mod: true, key: "s"};
    case "insert-link":
      return {mod: true, key: "l"};
    case "replace":
      return {mod: true, key: "x"};
    case "toggle":
      return {key: "Tab"};
    case "undo":
      return {ctrlLikeMod: true, key: "z"};
    case "new":
      return {key: "Enter"};
    case "new-before":
      return {key: "Enter", condition: "first-character"};
    case "focus-up":
      return {key: "ArrowUp", condition: "first-line"};
    case "focus-down":
      return {key: "ArrowDown", condition: "last-line"};
    case "zoom":
      return {special: "Middle click bullet"};
    default:
      return null;
  }
}

export const allActionsWithShortcuts: ActionName[] = [
  "indent",
  "unindent",
  "up",
  "down",
  "toggle",
  "focus-up",
  "focus-down",
  "new-child",
  "new-before",
  "new",
  "remove",
  "destroy",
  "insert-child",
  "insert-sibling",
  "insert-parent",
  "insert-link",
  "replace",
];
