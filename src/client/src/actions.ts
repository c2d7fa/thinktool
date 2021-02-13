import * as T from "./tree";
import * as D from "./data";
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
  | "toggle-type" // [TODO] We no longer need this
  | "toggle"
  | "home"
  | "forum"
  | "unfold";

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
    "toggle-type",
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
  } else {
    console.warn("enabled(..., %o): Did not know about action.", action);
    return true;
  }
}

export type UpdateConfig = {
  input(seedText?: string): Promise<[App, string]>;
};

export async function execute(
  app: App,
  action: ActionName,
  config: {
    openUrl(url: string): void;
    input(seedText?: string): Promise<[App, string]>;
  },
): Promise<App> {
  if (!enabled(app, action)) {
    console.error("The action %o is not enabled! Ignoring.", action);
    return app;
  }

  const result = await update(app, action, config);
  if (result.undo) console.warn("Undo is currently broken. Ignoring."); // [TODO]
  if (result.openUrl) config.openUrl(result.openUrl);
  return result.app ?? app;
}

interface UpdateResult {
  app?: App;
  openUrl?: string;
  undo?: boolean;
}

export async function update(app: App, action: keyof typeof updates, config: UpdateConfig): Promise<UpdateResult> {
  if (!enabled(app, action)) {
    console.error("The action %o should not be enabled! Continuing anyway...", action);
  }

  return await updateOn(app, action, T.focused(app.tree), config);
}

async function updateOn(
  app: App,
  action: keyof typeof updates,
  target: NodeRef | null,
  config: UpdateConfig,
): Promise<UpdateResult> {
  if (!enabled(app, action)) {
    console.warn("The action %o appears not to be enabled.", action);
  }

  return updates[action]({app, target, ...config});
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

type UpdateArgs = UpdateConfig & {
  app: App;
  target: NodeRef | null;
};

const updates = {
  async "unfold"({target, app}: UpdateArgs) {
    return {app: A.unfold(app, require(target))};
  },

  async "insert-sibling"({target, input}: UpdateArgs) {
    let [result, selection] = await input();
    const [newState, newTree] = T.insertSiblingAfter(result.state, result.tree, require(target), selection);
    return {app: A.merge(result, {state: newState, tree: newTree})};
  },

  async "insert-child"({target, input}: UpdateArgs) {
    let [result, selection] = await input();
    const [newState, newTree] = T.insertChild(result.state, result.tree, require(target), selection, 0);
    return {app: A.merge(result, {state: newState, tree: newTree})};
  },

  async "insert-parent"({target, input}: UpdateArgs) {
    let [result, selection] = await input();
    const [newState, newTree] = T.insertParent(result.state, result.tree, require(target), selection);
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "inserted-parent", childNode: require(target), newState, newTree});
    return {app: result};
  },

  async "new"({app, target}: UpdateArgs) {
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

  async "new-before"({app, target}: UpdateArgs) {
    const [newState, newTree, _, newId] = T.createSiblingBefore(app.state, app.tree, require(target));
    return {app: applyActionEvent(A.merge(app, {state: newState, tree: newTree}), {action: "created-item"})};
  },

  async "focus-up"({app}: UpdateArgs) {
    return {app: A.merge(app, {tree: T.focusUp(app.tree)})};
  },

  async "focus-down"({app}: UpdateArgs) {
    return {app: A.merge(app, {tree: T.focusDown(app.tree)})};
  },

  async "zoom"({app, target}: UpdateArgs) {
    let result = app;
    result = A.jump(result, T.thing(result.tree, require(target)));
    return {app: result};
  },

  async "indent"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.indent(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return {app: result};
  },

  async "unindent"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.unindent(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return {app: result};
  },

  async "down"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.moveDown(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return {app: result};
  },

  async "up"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.moveUp(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return {app: result};
  },

  async "new-child"({app, target}: UpdateArgs) {
    const result = A.createChild(app, require(target));
    return {app: applyActionEvent(result, {action: "created-item"})};
  },

  async "remove"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.remove(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "removed"});
    return {app: result};
  },

  async "destroy"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.removeThing(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "destroy"});
    return {app: result};
  },

  async "tutorial"({app}: UpdateArgs) {
    let result = app;
    result = A.merge(result, {tutorialState: Tutorial.reset(result.tutorialState)});
    return {app: result};
  },

  async "changelog"({app}: UpdateArgs) {
    return {app: A.merge(app, {changelogShown: !app.changelogShown})};
  },

  async "toggle-type"({app, target}: UpdateArgs) {
    let result = app;
    const newState = D.togglePage(result.state, T.thing(result.tree, require(target)));
    result = A.merge(result, {state: newState});
    return {app: result};
  },

  async "toggle"({app, target}: UpdateArgs) {
    let result = app;
    const newTree = T.toggle(result.state, result.tree, require(target));
    result = A.merge(result, {tree: newTree});
    result = applyActionEvent(result, {action: "toggled-item", newTree, node: require(target)});
    return {app: result};
  },

  async "home"({app}: UpdateArgs) {
    let result = app;
    const newTree = T.fromRoot(result.state, "0");
    result = applyActionEvent(result, {action: "home"});
    result = A.merge(result, {tree: newTree});
    return {app: result};
  },

  async "find"({app, input}: UpdateArgs) {
    const previouslyFocused = T.thing(app.tree, T.root(app.tree));
    let [result, selection] = await input();
    result = A.jump(result, selection);
    result = applyActionEvent(result, {action: "found", previouslyFocused, thing: selection});
    return {app: result};
  },

  async "insert-link"({input, target}: UpdateArgs) {
    let [result, selection] = await input();
    result = applyActionEvent(result, {action: "link-inserted"});
    result = A.editInsertLink(result, require(target), selection);
    return {app: result};
  },

  "undo"({}: UpdateArgs) {
    return {undo: true};
  },

  "forum"({}: UpdateArgs) {
    return {openUrl: "https://old.reddit.com/r/thinktool/"};
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
    case "toggle-type":
      return {mod: true, key: "t"};
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
  "toggle-type",
];
