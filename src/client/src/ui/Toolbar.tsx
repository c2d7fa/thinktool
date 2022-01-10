import * as React from "react";

import {App} from "../app";

import * as Ac from "../actions";
import * as Sh from "../shortcuts";
import * as Tu from "../tutorial";
import * as Ic from "./icons";

export type State = {
  groups: {
    title: string;
    actions: {
      action: Ac.ActionName;
      icon: string;
      description: string;
      label: string;
      isEnabled: boolean;
      isRelevant: boolean;
      isIntroduced: boolean;
    }[];
  }[];
};

const ToolbarButton = React.memo(
  function ToolbarButton(props: {
    onToolbarButtonPressed(action: Ac.ActionName): void;
    button: State["groups"][number]["actions"][number];
  }) {
    const shortcut = Sh.format(Ac.shortcut(props.button.action));

    return (
      <button
        className={
          props.button.isRelevant
            ? "tutorial-relevant"
            : !props.button.isIntroduced
            ? "tutorial-not-introduced"
            : ""
        }
        tabIndex={0}
        onFocus={(ev) => {
          console.log("Attempted focusing button %o", props.button.action);
        }}
        onMouseDown={(ev) => {
          console.log("Mouse down on button %o", props.button.action);
          // If we don't preventDefault, then we lose focus due to click on
          // background on macOS. This seems to happen in Safari, Firefox and
          // Chrome, but only on macOS for some reason.
          //
          // Last tested 2020-05-31. Don't remove this without testing on macOS.
          ev.preventDefault();
        }}
        onAuxClick={(ev) => {
          console.log("Clicked button %o (aux)", props.button.action);
          props.onToolbarButtonPressed(props.button.action);
          ev.preventDefault();
        }}
        onClick={(ev) => {
          console.log("Clicked button %o", props.button.action);
          props.onToolbarButtonPressed(props.button.action);
          ev.preventDefault();
        }}
        title={props.button.description + (shortcut === "" ? "" : ` [${shortcut}]`)}
        disabled={!props.button.isEnabled}
      >
        <Ic.IconLabel icon={props.button.icon}>{props.button.label}</Ic.IconLabel>
      </button>
    );
  },
  (prev, next) =>
    prev.onToolbarButtonPressed === next.onToolbarButtonPressed &&
    JSON.stringify(prev.button) === JSON.stringify(next.button),
);

const ToolbarGroup = React.memo(
  function ToolbarGroup(props: {
    onToolbarButtonPressed(action: Ac.ActionName): void;
    group: State["groups"][number];
  }) {
    return (
      <div className="toolbar-group named-toolbar-group">
        <h6>{props.group.title}</h6>
        <div>
          {props.group.actions.map((button) => (
            <ToolbarButton
              key={button.action}
              onToolbarButtonPressed={props.onToolbarButtonPressed}
              button={button}
            />
          ))}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.onToolbarButtonPressed === next.onToolbarButtonPressed &&
    JSON.stringify(prev.group) === JSON.stringify(next.group),
);

export function toolbar(app: App): State {
  const knownActions = {
    "home": {description: "Jump back to the default item.", icon: "mdiHomeOutline", label: "Home"},
    "find": {description: "Search for a specific item by its content.", icon: "mdiMagnify", label: "Find"},
    "zoom": {
      description:
        "Jump to the currently selected item. To select an item, just click somewhere inside that item's text.",
      icon: "mdiArrowURightBottom",
      label: "Jump",
    },
    "new": {
      description: "Create a new item as a sibling of the currently selected item",
      icon: "mdiPlusBoxOutline",
      label: "New",
    },
    "new-child": {
      description: "Create a new child of the selected item",
      icon: "mdiChevronDownBoxOutline",
      label: "New Child",
    },
    "remove": {
      description: "Remove the selected item from its parent. This does not delete the item.",
      icon: "mdiMinusCircleOutline",
      label: "Remove",
    },
    "destroy": {
      description:
        "Permanently delete the selected item. If this item has other parents, it will be removed from *all* parents.",
      icon: "mdiCloseBoxOutline",
      label: "Destroy",
    },
    "unindent": {description: "Unindent the selected item", icon: "mdiChevronDoubleLeft", label: "Unindent"},
    "indent": {description: "Indent the selected item", icon: "mdiChevronDoubleRight", label: "Indent"},
    "up": {description: "Move the selected item up", icon: "mdiChevronDoubleUp", label: "Up"},
    "down": {description: "Move the selected item down", icon: "mdiChevronDoubleDown", label: "Down"},
    "insert-sibling": {
      description: "Insert an existing item as a sibling after the currently selected item.",
      icon: "mdiPlusCircleOutline",
      label: "Sibling",
    },
    "insert-child": {
      description: "Insert an existing item as a child of the currently selected item.",
      icon: "mdiChevronDownCircleOutline",
      label: "Child",
    },
    "insert-parent": {
      description: "Insert an existing item as a parent of the currently selected item.",
      icon: "mdiChevronUpCircleOutline",
      label: "Parent",
    },
    "insert-link": {
      description: "Insert a reference to an existing item at the position of the text.",
      icon: "mdiArrowRightCircleOutline",
      label: "Link",
    },
    "forum": {description: "Open the subreddit.", icon: "mdiForumOutline", label: "Forum"},
    "tutorial": {description: "Go through the tutorial again.", icon: "mdiSchoolOutline", label: "Tutorial"},
    "changelog": {
      description: "Show list of updates to Thinktool.",
      icon: "mdiNewspaperVariantOutline",
      label: "Updates",
    },
    "unfold": {
      description: "Recursively show all children of selected item.",
      icon: "mdiDotsHorizontal",
      label: "Unfold",
    },
    "view-outline": {description: "Switch to the outline view", icon: "mdiFileTree", label: "Outline"},
    "view-orphans": {
      description: "Switch to the inbox view, which shows all items that aren't part of the outline",
      icon: "mdiTrayFull",
      label: "Inbox",
    },
  };

  function lookup(action: keyof typeof knownActions) {
    return {
      ...knownActions[action],
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

export const Toolbar = React.memo(
  function Toolbar(props: {onToolbarButtonPressed(action: Ac.ActionName): void; toolbar: State}) {
    return (
      <div className="toolbar">
        {props.toolbar.groups.map((group) => (
          <ToolbarGroup key={group.title} onToolbarButtonPressed={props.onToolbarButtonPressed} group={group} />
        ))}
      </div>
    );
  },
  (prev, next) =>
    prev.onToolbarButtonPressed === next.onToolbarButtonPressed &&
    JSON.stringify(prev.toolbar) === JSON.stringify(next.toolbar),
);
