import {AppState, Context} from "./context";
import * as A from "./context";
import * as T from "./tree";
import * as D from "./data";
import * as Tutorial from "./tutorial";
import * as S from "./shortcuts";
import * as Goal from "./goal";
import {NodeRef} from "./tree-internal";

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
  | "forum";

// Some actions can only be executed under some circumstances, for example if an
// item is selected.
//
// If enabled(context, action) returns false, then the toolbar button for the
// given action should be disabled, and pressing the shortcut should not execute
// the action.
export function enabled(state: AppState, action: ActionName): boolean {
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

function tutorialAction(context: Context, event: Goal.ActionEvent) {
  context.setTutorialState(Tutorial.action(context.tutorialState, event));
}

export function execute(context: Context, action: ActionName): void {
  if (!enabled(context, action)) {
    console.error("The action %o is not enabled! Ignoring.", action);
    return;
  }

  const focused = T.focused(context.tree);
  if (focused === null) throw `Bug in 'enabled'. Ran action '${action}', even though there was no node selected.`;

  executeOn(context, action, focused);
}

export function executeOn(context: Context, action: ActionName, target: NodeRef | null): void {
  if (!enabled(context, action)) {
    console.warn("The action %o appears not to be enabled.", action);
  }

  if (action in updates) {
    const updatableAction = action as keyof typeof updates;

    (async () => {
      // [TODO] This is implemented in a hacky way due to the fact that the
      // popup system was originally designed to be used in a different way. We
      // should refactor this so that we don't need to create this weird wrapper
      // for creating popups.
      async function input(): Promise<[AppState, string]> {
        return new Promise((resolve, reject) => {
          context.send("start-popup", {
            target,
            complete(state, tree, target, selection) {
              resolve([A.merge(context, {state, tree}), selection]);
              // [TODO] Hack
              return [D.empty, T.fromRoot(D.empty, "0")];
            },
          });
        });
      }

      const newAppState = await updateOn(context, updatableAction, target, {input});
      context.setState(newAppState.state);
      context.setTree(newAppState.tree);
      context.setTutorialState(newAppState.tutorialState);
    })();

    return;
  }

  const implementation = implementations[action];
  if (typeof implementation !== "function")
    throw `Bug in 'execute'. Action '${action}' did not have an implementation.`;
  implementation(context, target);
}

export async function update(
  app: AppState,
  action: keyof typeof updates,
  config: UpdateConfig,
): Promise<AppState> {
  if (!enabled(app, action)) {
    console.error("The action %o should not be enabled! Continuing anyway...", action);
  }

  return await updateOn(app, action, T.focused(app.tree), config);
}

async function updateOn(
  app: AppState,
  action: keyof typeof updates,
  target: NodeRef | null,
  config: UpdateConfig,
): Promise<AppState> {
  if (!enabled(app, action)) {
    console.warn("The action %o appears not to be enabled.", action);
  }

  return updates[action]({app, target, input: config.input});
}

function require<T>(x: T | null): T {
  if (x === null) {
    throw "A value was unexpectedly null.";
  }
  return x;
}

function applyActionEvent(app: AppState, event: Goal.ActionEvent): AppState {
  return A.merge(app, {tutorialState: Tutorial.action(app.tutorialState, event)});
}

export type UpdateConfig = {
  input: () => Promise<[AppState, string]>;
};

type UpdateArgs = UpdateConfig & {
  app: AppState;
  target: NodeRef | null;
};

const updates = {
  async "insert-sibling"({target, input}: UpdateArgs) {
    let [result, selection] = await input();
    const [newState, newTree] = T.insertSiblingAfter(result.state, result.tree, require(target), selection);
    return A.merge(result, {state: newState, tree: newTree});
  },

  async "insert-child"({target, input}: UpdateArgs) {
    let [result, selection] = await input();
    const [newState, newTree] = T.insertChild(result.state, result.tree, require(target), selection, 0);
    return A.merge(result, {state: newState, tree: newTree});
  },

  async "insert-parent"({target, input}: UpdateArgs) {
    let [result, selection] = await input();
    const [newState, newTree] = T.insertParent(result.state, result.tree, require(target), selection);
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "inserted-parent", childNode: require(target), newState, newTree});
    return result;
  },

  async new({app, target}: UpdateArgs) {
    let result = app;
    if (target === null) {
      let [newState, newTree, _, newId] = T.createChild(app.state, app.tree, T.root(app.tree));
      newTree = T.focus(newTree, newId);
      result = A.merge(result, {state: newState, tree: newTree});
    } else {
      let [newState, newTree, _, newId] = T.createSiblingAfter(app.state, app.tree, target);
      newTree = T.focus(newTree, newId);
      result = A.merge(result, {state: newState, tree: newTree});
    }
    result = applyActionEvent(result, {action: "created-item"});
    return result;
  },

  async "new-before"({app, target}: UpdateArgs) {
    const [newState, newTree, _, newId] = T.createSiblingBefore(app.state, app.tree, require(target));
    return applyActionEvent(A.merge(app, {state: newState, tree: newTree}), {action: "created-item"});
  },

  async "focus-up"({app}: UpdateArgs) {
    return A.merge(app, {tree: T.focusUp(app.tree)});
  },

  async "focus-down"({app}: UpdateArgs) {
    return A.merge(app, {tree: T.focusDown(app.tree)});
  },

  async zoom({app, target}: UpdateArgs) {
    let result = app;
    const previouslyFocused = T.thing(result.tree, T.root(result.tree));
    result = A.merge(result, {selectedThing: T.thing(result.tree, require(target))});
    result = applyActionEvent(result, {
      action: "jump",
      previouslyFocused,
      thing: T.thing(result.tree, require(target)),
    });
    return result;
  },

  async indent({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.indent(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return result;
  },

  async unindent({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.unindent(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return result;
  },

  async down({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.moveDown(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return result;
  },

  async up({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.moveUp(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "moved"});
    return result;
  },

  async "new-child"({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree, _, newId] = T.createChild(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: T.focus(newTree, newId)});
    result = applyActionEvent(result, {action: "created-item"});
    return result;
  },

  async remove({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.remove(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "removed"});
    return result;
  },

  async destroy({app, target}: UpdateArgs) {
    let result = app;
    const [newState, newTree] = T.removeThing(result.state, result.tree, require(target));
    result = A.merge(result, {state: newState, tree: newTree});
    result = applyActionEvent(result, {action: "destroy"});
    return result;
  },

  async tutorial({app}: UpdateArgs) {
    let result = app;
    result = A.merge(result, {tutorialState: Tutorial.reset(result.tutorialState)});
    return result;
  },

  async changelog({app}: UpdateArgs) {
    return A.merge(app, {changelogShown: !app.changelogShown});
  },

  async "toggle-type"({app, target}: UpdateArgs) {
    let result = app;
    const newState = D.togglePage(result.state, T.thing(result.tree, require(target)));
    result = A.merge(result, {state: newState});
    return result;
  },

  async toggle({app, target}: UpdateArgs) {
    let result = app;
    const newTree = T.toggle(result.state, result.tree, require(target));
    result = A.merge(result, {tree: newTree});
    result = applyActionEvent(result, {action: "toggled-item", newTree, node: require(target)});
    return result;
  },

  async home({app}: UpdateArgs) {
    let result = app;
    const newTree = T.fromRoot(result.state, "0");
    result = applyActionEvent(result, {action: "home"});
    result = A.merge(result, {tree: newTree});
    return result;
  },
};

const implementations: {
  [k: string]: ((context: Context, focused: T.NodeRef | null) => void) | undefined;
} = {
  "insert-link"(context, focused) {
    const node = focused;

    context.setPopupTarget(node);
    context.setActivePopup((state, tree, target, selection) => {
      if (target !== node) console.error("Unexpected target/node");
      if (context.activeEditor === null) throw "No active editor.";
      tutorialAction(context, {action: "link-inserted"});
      context.activeEditor.replaceSelectionWithLink(selection, D.contentText(state, selection));
      return [state, tree];
    });
  },

  find(context) {
    // This is a hack on how setActivePopup is supposed to be used.
    const previouslyFocused = T.thing(context.tree, T.root(context.tree));
    context.setPopupTarget({id: 0});
    context.setActivePopup((state, tree, target, selection) => {
      context.setSelectedThing(selection);
      tutorialAction(context, {action: "found", previouslyFocused, thing: selection});
      return [state, tree];
    });
  },

  undo(context, focused) {
    context.undo();
  },

  forum(context, focused) {
    context.openExternalUrl("https://old.reddit.com/r/thinktool/");
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
