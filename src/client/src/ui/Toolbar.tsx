import * as React from "react";
import * as T from "../tree";
import * as Tutorial from "../tutorial";
import {Context} from "../context";
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
  context: Context;
}) {
  const shortcut = Sh.format(Ac.shortcut(props.action));

  return (
    <button
      className={
        Tutorial.isRelevant(props.context.tutorialState, props.action)
          ? "tutorial-relevant"
          : Tutorial.isNotIntroduced(props.context.tutorialState, props.action)
          ? "tutorial-not-introduced"
          : ""
      }
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
      onClick={(ev) => {
        console.log("Clicked button %o", props.action);
        Ac.execute(props.context, props.action);
        ev.preventDefault();
      }}
      title={props.description + (shortcut === "" ? "" : ` [${shortcut}]`)}
      disabled={!Ac.enabled(props.context, props.action)}>
      <span className={`icon fas fa-${props.icon}`}></span>
      {props.label}
    </button>
  );
}

export default function Toolbar(props: {context: Context}) {
  return (
    <div className="toolbar">
      <ToolbarGroup title="Navigate">
        <ToolbarButton
          action="find"
          description="Search for a specific item by its content."
          icon="search"
          label="Find"
          context={props.context}
        />
        <ToolbarButton
          action="zoom"
          description="Zoom in on selected item"
          icon="expand-arrows-alt"
          label="Zoom"
          context={props.context}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Item">
        <ToolbarButton
          action="new"
          description="Create a new item as a sibling of the currently selected item"
          icon="plus-square"
          label="New"
          context={props.context}
        />
        <ToolbarButton
          action="new-child"
          description="Create a new child of the selected item"
          icon="caret-square-down"
          label="New Child"
          context={props.context}
        />
        <ToolbarButton
          action="remove"
          description="Remove the selected item from its parent. This does not delete the item."
          icon="minus-square"
          label="Remove"
          context={props.context}
        />
        <ToolbarButton
          action="destroy"
          description="Permanently delete the selected item. If this item has other parents, it will be removed from *all* parents."
          icon="trash"
          label="Destroy"
          context={props.context}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Move">
        <ToolbarButton
          action="unindent"
          description="Unindent the selected item"
          icon="chevron-left"
          label="Unindent"
          context={props.context}
        />
        <ToolbarButton
          action="indent"
          description="Indent the selected item"
          icon="chevron-right"
          label="Indent"
          context={props.context}
        />
        <ToolbarButton
          action="up"
          description="Move the selected item up"
          icon="chevron-up"
          label="Up"
          context={props.context}
        />
        <ToolbarButton
          action="down"
          description="Move the selected item down"
          icon="chevron-down"
          label="Down"
          context={props.context}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Connect">
        <ToolbarButton
          action="insert-sibling"
          description="Insert an existing item as a sibling after the currently selected item."
          icon="plus-circle"
          label="Sibling"
          context={props.context}
        />
        <ToolbarButton
          action="insert-child"
          description="Insert an existing item as a child of the currently selected item."
          icon="chevron-circle-down"
          label="Child"
          context={props.context}
        />
        <ToolbarButton
          action="insert-parent"
          description="Insert an existing item as a parent of the currently selected item."
          icon="chevron-circle-up"
          label="Parent"
          context={props.context}
        />
        <ToolbarButton
          action="insert-link"
          description="Insert a reference to an existing item at the position of the text."
          icon="link"
          label="Link"
          context={props.context}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Help">
        <ToolbarButton
          action="tutorial"
          description="Go through the tutorial again."
          icon="info"
          label="Tutorial"
          context={props.context}
        />
        <ToolbarButton
          action="changelog"
          description="Show list of updates to Thinktool."
          icon="list"
          label="Updates"
          context={props.context}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Type">
        <ToolbarButton
          action="toggle-type"
          description="Toggle type of focused item between 'Note' (default) and 'Page' types."
          icon="sticky-note"
          label="Toggle"
          context={props.context}
        />
      </ToolbarGroup>
    </div>
  );
}
