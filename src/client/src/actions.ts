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
  | "toggle-type"
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
    console.warn("The action %o appears not to be enabled.", action)
  }

  if (action === "new") {
    const newAppState = updateOn(context, action, target)
    context.setState(newAppState.state)
    context.setTree(newAppState.tree)
    context.setTutorialState(newAppState.tutorialState)
    return;
  }

  const implementation = implementations[action];
  if (typeof implementation !== "function")
    throw `Bug in 'execute'. Action '${action}' did not have an implementation.`;
  implementation(context, target);
}

export function update(app: AppState, action: "new"): AppState {
  return updateOn(app, action, T.focused(app.tree));
}

export function updateOn(app: AppState, action: "new", target: NodeRef | null): AppState {
  return updates[action](app, target);
}

function require<T>(x: T | null): T {
  if (x === null) {
    throw "A value was unexpectedly null."
  }
  return x;
}

const updates = {
  new(app: AppState, target: NodeRef | null): AppState {
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
    result = A.merge(result, {tutorialState: Tutorial.action(result.tutorialState, {action: "created-item"})});
    return result;
  },
};

const implementations: {
  [k: string]: ((context: Context, focused: T.NodeRef | null) => void) | undefined;
} = {
  "insert-sibling"(context, focused) {
    context.send("start-popup", {
      target: focused,
      complete(state, tree, target, selection) {
        const [newState, newTree] = T.insertSiblingAfter(state, tree, target, selection);
        return [newState, newTree];
      },
    });
  },

  "insert-child"(context, focused) {
    context.send("start-popup", {
      target: focused,
      complete(state, tree, target, selection) {
        const [newState, newTree] = T.insertChild(state, tree, target, selection, 0);
        return [newState, newTree];
      },
    });
  },

  "insert-parent"(context, focused) {
    context.send("start-popup", {
      target: focused,
      complete(state, tree, target, selection) {
        const [newState, newTree] = T.insertParent(state, tree, target, selection);
        tutorialAction(context, {action: "inserted-parent", childNode: target, newState, newTree});
        return [newState, newTree];
      },
    });
  },

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

  "new-before"(context, focused) {
    const [newState, newTree, _, newId] = T.createSiblingBefore(context.state, context.tree, require(focused));
    context.setState(newState);
    context.setTree(T.focus(newTree, newId));
    tutorialAction(context, {action: "created-item"});
  },

  "focus-up"(context, focused) {
    context.setTree(T.focusUp(context.tree));
  },

  "focus-down"(context, focused) {
    context.setTree(T.focusDown(context.tree));
  },

  zoom(context, focused) {
    const previouslyFocused = T.thing(context.tree, T.root(context.tree));
    context.setSelectedThing(T.thing(context.tree, require(focused)));
    tutorialAction(context, {action: "jump", previouslyFocused, thing: T.thing(context.tree, require(focused))});
  },

  indent(context, focused) {
    const [newState, newTree] = T.indent(context.state, context.tree, require(focused));
    context.setState(newState);
    context.setTree(newTree);
    tutorialAction(context, {action: "moved"});
  },

  unindent(context, focused) {
    const [newState, newTree] = T.unindent(context.state, context.tree, require(focused));
    context.setState(newState);
    context.setTree(newTree);
    tutorialAction(context, {action: "moved"});
  },

  down(context, focused) {
    const [newState, newTree] = T.moveDown(context.state, context.tree, require(focused));
    context.setState(newState);
    context.setTree(newTree);
    tutorialAction(context, {action: "moved"});
  },

  up(context, focused) {
    const [newState, newTree] = T.moveUp(context.state, context.tree, require(focused));
    context.setState(newState);
    context.setTree(newTree);
    tutorialAction(context, {action: "moved"});
  },

  "new-child"(context, focused) {
    const [newState, newTree, _, newId] = T.createChild(context.state, context.tree, require(focused));
    context.setState(newState);
    context.setTree(T.focus(newTree, newId));
    tutorialAction(context, {action: "created-item"});
  },

  remove(context, focused) {
    const [newState, newTree] = T.remove(context.state, context.tree, require(focused));
    context.setState(newState);
    context.setTree(newTree);
    tutorialAction(context, {action: "removed"});
  },

  destroy(context, focused) {
    const [newState, newTree] = T.removeThing(context.state, context.tree, require(focused));
    context.setState(newState);
    context.setTree(newTree);
    tutorialAction(context, {action: "destroy"});
  },

  tutorial(context, focused) {
    context.setTutorialState(Tutorial.reset(context.tutorialState));
  },

  changelog(context, focused) {
    context.setChangelogShown(!context.changelogShown);
  },

  undo(context, focused) {
    context.undo();
  },

  "toggle-type"(context, focused) {
    const newState = D.togglePage(context.state, T.thing(context.tree, require(focused)));
    context.setState(newState);
  },

  toggle(context, focused) {
    const newTree = T.toggle(context.state, context.tree, require(focused));
    context.setTree(newTree);
    tutorialAction(context, {action: "toggled-item", newTree, node: require(focused)});
  },

  home(context, focused) {
    const newTree = T.fromRoot(context.state, "0");
    tutorialAction(context, {action: "home"});
    context.setTree(newTree);
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
