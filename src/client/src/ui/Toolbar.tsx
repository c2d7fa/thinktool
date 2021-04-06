import * as React from "react";
import * as Ac from "../actions";
import * as Sh from "../shortcuts";

function ToolbarGroup(props: {children: React.ReactNode; title?: string}) {
  if (props.title === undefined) {
    return (
      <div className="toolbar-group unnamed-toolbar-group">
        <div>{props.children}</div>
      </div>
    );
  } else {
    return (
      <div className="toolbar-group named-toolbar-group">
        <h6>{props.title}</h6>
        <div>{props.children}</div>
      </div>
    );
  }
}

function ToolbarButton(props: {
  action: Ac.ActionName;
  description: string;
  icon: string;
  label: string;
  execute(): void;
  isRelevant: boolean;
  isNotIntroduced: boolean;
  isEnabled: boolean;
}) {
  const shortcut = Sh.format(Ac.shortcut(props.action));

  const iconClasses = props.icon === "reddit" ? "fab fa-fw fa-reddit-alien" : `fas fa-fw fa-${props.icon}`;

  return (
    <button
      className={props.isRelevant ? "tutorial-relevant" : props.isNotIntroduced ? "tutorial-not-introduced" : ""}
      tabIndex={0}
      onFocus={(ev) => {
        console.log("Attempted focusing button %o", props.action);
      }}
      onMouseDown={(ev) => {
        console.log("Mouse down on button %o", props.action);
        // If we don't preventDefault, then we lose focus due to click on
        // background on macOS. This seems to happen in Safari, Firefox and
        // Chrome, but only on macOS for some reason.
        //
        // Last tested 2020-05-31. Don't remove this without testing on macOS.
        ev.preventDefault();
      }}
      onAuxClick={(ev) => {
        console.log("Clicked button %o (aux)", props.action);
        props.execute();
        ev.preventDefault();
      }}
      onClick={(ev) => {
        console.log("Clicked button %o", props.action);
        props.execute();
        ev.preventDefault();
      }}
      title={props.description + (shortcut === "" ? "" : ` [${shortcut}]`)}
      disabled={!props.isEnabled}
    >
      <span className={`icon ${iconClasses}`}></span>
      {props.label}
    </button>
  );
}



export default function Toolbar(props: {
  executeAction(action: Ac.ActionName): void,
  isEnabled(action: Ac.ActionName): boolean,
  isRelevant(action: Ac.ActionName): boolean,
  isNotIntroduced(action: Ac.ActionName): boolean,
}) {
  const knownActions = {
    "home": {description: "Jump back to the default item.", icon: "home", label: "Home"},
    "find": {description: "Search for a specific item by its content.", icon: "search", label: "Find"},
    "zoom": {description: "Jump to the currently selected item. To select an item, just click somewhere inside that item's text.", icon: "hand-point-right", label: "Jump"},
    "new": {description: "Create a new item as a sibling of the currently selected item", icon: "plus-square", label: "New"},
    "new-child": {description: "Create a new child of the selected item", icon: "caret-square-down", label: "New Child"},
    "remove": {description: "Remove the selected item from its parent. This does not delete the item.", icon: "minus-square", label: "Remove"},
    "destroy": {description: "Permanently delete the selected item. If this item has other parents, it will be removed from *all* parents.", icon: "trash", label: "Destroy"},
    "unindent": {description: "Unindent the selected item", icon: "chevron-left", label: "Unindent"},
    "indent": {description: "Indent the selected item", icon: "chevron-right", label: "Indent"},
    "up": {description: "Move the selected item up", icon: "chevron-up", label: "Up"},
    "down": {description: "Move the selected item down", icon: "chevron-down", label: "Down"},
    "insert-sibling": {description: "Insert an existing item as a sibling after the currently selected item.", icon: "plus-circle", label: "Sibling"},
    "insert-child": {description: "Insert an existing item as a child of the currently selected item.", icon: "chevron-circle-down", label: "Child"},
    "insert-parent": {description: "Insert an existing item as a parent of the currently selected item.", icon: "chevron-circle-up", label: "Parent"},
    "insert-link": {description: "Insert a reference to an existing item at the position of the text.", icon: "link", label: "Link"},
    "forum": {description: "Open the subreddit.", icon: "reddit", label: "Forum"},
    "tutorial": {description: "Go through the tutorial again.", icon: "info", label: "Tutorial"},
    "changelog": {description: "Show list of updates to Thinktool.", icon: "list", label: "Updates"},
    "unfold": {description: "Recursively show all children of selected item.", icon: "stream", label: "Unfold"},
    "view-outline": {description: "Switch to the outline view", icon: "list-alt", label: "Outline"},
    "view-orphans": {description: "Switch to the inbox view, which shows all items that aren't part of the outline", icon: "sticky-note", label: "Inbox"},
  }

  function lookup(action: keyof typeof knownActions) {
    return {
      ...knownActions[action],
      action,
      isEnabled: props.isEnabled(action),
      execute: () => props.executeAction(action),
      isRelevant: props.isRelevant(action),
      isNotIntroduced: props.isNotIntroduced(action),
    };
  }

  return (
    <div className="toolbar">
      <ToolbarGroup title="Navigate">
          <ToolbarButton {...lookup("home")}/>
          <ToolbarButton {...lookup("find")}/>
          <ToolbarButton {...lookup("zoom")}/>
          <ToolbarButton {...lookup("unfold")}/>
      </ToolbarGroup>
      <ToolbarGroup title="Item">
          <ToolbarButton {...lookup("new")}/>
          <ToolbarButton {...lookup("new-child")}/>
          <ToolbarButton {...lookup("remove")}/>
          <ToolbarButton {...lookup("destroy")}/>
      </ToolbarGroup>
      <ToolbarGroup title="Move">
          <ToolbarButton {...lookup("unindent")}/>
          <ToolbarButton {...lookup("indent")}/>
          <ToolbarButton {...lookup("up")}/>
          <ToolbarButton {...lookup("down")}/>
      </ToolbarGroup>
      <ToolbarGroup title="Connect">
          <ToolbarButton {...lookup("insert-sibling")}/>
          <ToolbarButton {...lookup("insert-child")}/>
          <ToolbarButton {...lookup("insert-parent")}/>
          <ToolbarButton {...lookup("insert-link")}/>
      </ToolbarGroup>
      <ToolbarGroup title="Help">
          <ToolbarButton {...lookup("forum")}/>
          <ToolbarButton {...lookup("tutorial")}/>
          <ToolbarButton {...lookup("changelog")}/>
      </ToolbarGroup>
      <ToolbarGroup title="View">
        <ToolbarButton {...lookup("view-outline")}/>
        <ToolbarButton {...lookup("view-orphans")}/>
      </ToolbarGroup>
    </div>
  );
}
