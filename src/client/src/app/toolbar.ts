import {App} from ".";

import * as Ac from "../actions";
import * as Tu from "../tutorial";
import * as Ic from "../ui/icons";

export type View = {
  groups: {
    title: string;
    actions: {
      action: Ac.ActionName;
      icon: Ic.IconId;
      description: string;
      label: string;
      isEnabled: boolean;
      isRelevant: boolean;
      isIntroduced: boolean;
    }[];
  }[];
};

export function viewToolbar(app: App): View {
  const knownActions: {[action in Ac.ActionName]?: {description: string; icon: Ic.IconId; label: string}} = {
    "home": {description: "Jump back to the default item.", icon: "home", label: "Home"},
    "find": {description: "Search for a specific item by its content.", icon: "find", label: "Find"},
    "zoom": {
      description:
        "Jump to the currently selected item. To select an item, just click somewhere inside that item's text.",
      icon: "jump",
      label: "Jump",
    },
    "new": {
      description: "Create a new item as a sibling of the currently selected item",
      icon: "new",
      label: "New",
    },
    "new-child": {description: "Create a new child of the selected item", icon: "newChild", label: "New Child"},
    "remove": {
      description: "Remove the selected item from its parent. This does not delete the item.",
      icon: "remove",
      label: "Remove",
    },
    "destroy": {
      description:
        "Permanently delete the selected item. If this item has other parents, it will be removed from *all* parents.",
      icon: "destroy",
      label: "Destroy",
    },
    "unindent": {description: "Unindent the selected item", icon: "unindent", label: "Unindent"},
    "indent": {description: "Indent the selected item", icon: "indent", label: "Indent"},
    "up": {description: "Move the selected item up", icon: "up", label: "Up"},
    "down": {description: "Move the selected item down", icon: "down", label: "Down"},
    "insert-sibling": {
      description: "Insert an existing item as a sibling after the currently selected item.",
      icon: "insertSibling",
      label: "Sibling",
    },
    "insert-child": {
      description: "Insert an existing item as a child of the currently selected item.",
      icon: "insertChild",
      label: "Child",
    },
    "insert-parent": {
      description: "Insert an existing item as a parent of the currently selected item.",
      icon: "insertParent",
      label: "Parent",
    },
    "insert-link": {
      description: "Insert a reference to an existing item at the position of the text.",
      icon: "insertLink",
      label: "Link",
    },
    "forum": {description: "Open the subreddit.", icon: "forum", label: "Forum"},
    "tutorial": {description: "Go through the tutorial again.", icon: "tutorial", label: "Tutorial"},
    "changelog": {description: "Show list of updates to Thinktool.", icon: "changelog", label: "Updates"},
    "unfold": {description: "Recursively show all children of selected item.", icon: "unfold", label: "Unfold"},
    "view-outline": {description: "Switch to the outline view", icon: "outline", label: "Outline"},
    "view-orphans": {
      description: "Switch to the inbox view, which shows all items that aren't part of the outline",
      icon: "inbox",
      label: "Inbox",
    },
  };

  function lookup(action: keyof typeof knownActions): View["groups"][number]["actions"][number] {
    const known = knownActions[action];
    if (!known) throw new Error(`Unknown action ${action}`);
    return {
      ...known,
      action,
      isEnabled: Ac.enabled(app, action),
      isRelevant: Tu.isRelevant(app.tutorialState, action),
      isIntroduced: !Tu.isNotIntroduced(app.tutorialState, action),
    };
  }

  return {
    groups: [
      {title: "Navigate", actions: [lookup("home"), lookup("find"), lookup("zoom"), lookup("unfold")]},
      {title: "Item", actions: [lookup("new"), lookup("new-child"), lookup("remove"), lookup("destroy")]},
      {title: "Move", actions: [lookup("unindent"), lookup("indent"), lookup("up"), lookup("down")]},
      {
        title: "Connect",
        actions: [
          lookup("insert-sibling"),
          lookup("insert-child"),
          lookup("insert-parent"),
          lookup("insert-link"),
        ],
      },
      {title: "Help", actions: [lookup("forum"), lookup("tutorial"), lookup("changelog")]},
      {title: "View", actions: [lookup("view-outline"), lookup("view-orphans")]},
    ],
  };
}
