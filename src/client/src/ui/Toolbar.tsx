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
  shortcut?: string;
  icon: string;
  label: string;
  context: Context;
  enabled: boolean;
}) {
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
      title={props.description + (props.shortcut === undefined ? "" : ` [${props.shortcut}]`)}
      disabled={!props.enabled}>
      <span className={`icon gg-${props.icon}`}></span>
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
          shortcut={Sh.format(Ac.shortcut("find"))}
          icon="search"
          label="Find"
          enabled={Ac.enabled(props.context, "find")}
          context={props.context}
        />
        <ToolbarButton
          action="zoom"
          description="Zoom in on selected item"
          shortcut={Sh.format(Ac.shortcut("zoom"))}
          icon="maximize-alt"
          label="Zoom"
          context={props.context}
          enabled={Ac.enabled(props.context, "zoom")}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Item">
        <ToolbarButton
          action="new"
          description="Create a new item as a sibling of the currently selected item"
          shortcut={Sh.format(Ac.shortcut("new"))}
          icon="add-r"
          label="New"
          context={props.context}
          enabled={Ac.enabled(props.context, "new")}
        />
        <ToolbarButton
          action="new-child"
          description="Create a new child of the selected item"
          shortcut={Sh.format(Ac.shortcut("new-child"))}
          icon="arrow-bottom-right-r"
          label="New Child"
          context={props.context}
          enabled={Ac.enabled(props.context, "new-child")}
        />
        <ToolbarButton
          action="remove"
          description="Remove the selected item from its parent. This does not delete the item."
          shortcut={Sh.format(Ac.shortcut("remove"))}
          icon="remove-r"
          label="Remove"
          context={props.context}
          enabled={Ac.enabled(props.context, "remove")}
        />
        <ToolbarButton
          action="destroy"
          description="Permanently delete the selected item. If this item has other parents, it will be removed from *all* parents."
          shortcut={Sh.format(Ac.shortcut("destroy"))}
          icon="trash"
          label="Destroy"
          context={props.context}
          enabled={Ac.enabled(props.context, "destroy")}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Move">
        <ToolbarButton
          action="unindent"
          description="Unindent the selected item"
          shortcut={Sh.format(Ac.shortcut("unindent"))}
          icon="push-chevron-left"
          label="Unindent"
          context={props.context}
          enabled={Ac.enabled(props.context, "unindent")}
        />
        <ToolbarButton
          action="indent"
          description="Indent the selected item"
          shortcut={Sh.format(Ac.shortcut("indent"))}
          icon="push-chevron-right"
          label="Indent"
          context={props.context}
          enabled={Ac.enabled(props.context, "indent")}
        />
        <ToolbarButton
          action="up"
          description="Move the selected item up"
          shortcut={Sh.format(Ac.shortcut("up"))}
          icon="push-chevron-up"
          label="Up"
          context={props.context}
          enabled={Ac.enabled(props.context, "up")}
        />
        <ToolbarButton
          action="down"
          description="Move the selected item down"
          shortcut={Sh.format(Ac.shortcut("down"))}
          icon="push-chevron-down"
          label="Down"
          context={props.context}
          enabled={Ac.enabled(props.context, "down")}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Connect">
        <ToolbarButton
          action="insert-sibling"
          description="Insert an existing item as a sibling after the currently selected item."
          shortcut={Sh.format(Ac.shortcut("insert-sibling"))}
          icon="add"
          label="Sibling"
          context={props.context}
          enabled={Ac.enabled(props.context, "insert-sibling")}
        />
        <ToolbarButton
          action="insert-child"
          description="Insert an existing item as a child of the currently selected item."
          shortcut={Sh.format(Ac.shortcut("insert-child"))}
          icon="arrow-bottom-right-o"
          label="Child"
          context={props.context}
          enabled={Ac.enabled(props.context, "insert-child")}
        />
        <ToolbarButton
          action="insert-parent"
          description="Insert an existing item as a parent of the currently selected item."
          shortcut={Sh.format(Ac.shortcut("insert-parent"))}
          icon="arrow-top-left-o"
          label="Parent"
          context={props.context}
          enabled={Ac.enabled(props.context, "insert-parent")}
        />
        <ToolbarButton
          action="insert-link"
          description="Insert a reference to an existing item at the position of the text."
          shortcut={Sh.format(Ac.shortcut("insert-link"))}
          icon="file-document"
          label="Link"
          context={props.context}
          enabled={Ac.enabled(props.context, "insert-link")}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Help">
        <ToolbarButton
          action="tutorial"
          description="Go through the tutorial again."
          icon="info"
          label="Tutorial"
          context={props.context}
          enabled={Ac.enabled(props.context, "tutorial")}
        />
        <ToolbarButton
          action="changelog"
          description="Show list of updates to Thinktool."
          icon="list"
          label="Updates"
          context={props.context}
          enabled={true}
        />
      </ToolbarGroup>
    </div>
  );
}
