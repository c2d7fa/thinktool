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
  name: Tutorial.FunctionName;
  context: Context;
  enabled: boolean;
}) {
  return (
    <button
      className={
        Tutorial.isRelevant(props.context.tutorialState, props.name)
          ? "tutorial-relevant"
          : Tutorial.isNotIntroduced(props.context.tutorialState, props.name)
          ? "tutorial-not-introduced"
          : ""
      }
      tabIndex={0}
      onFocus={(ev) => {
        console.log("Attempted focusing button %o", props.name);
      }}
      onMouseDown={(ev) => {
        console.log("Mouse down on button %o", props.name);
        // If we don't preventDefault, then we lose focus due to click on
        // background on macOS. This seems to happen in Safari, Firefox and
        // Chrome, but only on macOS for some reason.
        //
        // Last tested 2020-05-31. Don't remove this without testing on macOS.
        ev.preventDefault();
      }}
      onClick={(ev) => {
        console.log("Clicked button %o", props.name);
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
          shortcut={Sh.format(Sh.standard.find)}
          icon="search"
          label="Find"
          enabled={Ac.enabled(props.context, "find")}
          context={props.context}
          name="find"
        />
        <ToolbarButton
          action="zoom"
          description="Zoom in on selected item"
          shortcut="Middle click bullet"
          icon="maximize-alt"
          label="Zoom"
          context={props.context}
          name="zoom"
          enabled={Ac.enabled(props.context, "zoom")}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Item">
        <ToolbarButton
          action="new"
          description="Create a new item as a sibling of the currently selected item"
          shortcut={`Enter/${Sh.format(Sh.standard.forceCreateSibling)}`}
          icon="add-r"
          label="New"
          context={props.context}
          name="new"
          enabled={Ac.enabled(props.context, "new")}
        />
        <ToolbarButton
          action="new-child"
          description="Create a new child of the selected item"
          shortcut={Sh.format(Sh.standard.createChild)}
          icon="arrow-bottom-right-r"
          label="New Child"
          context={props.context}
          name="new-child"
          enabled={Ac.enabled(props.context, "new-child")}
        />
        <ToolbarButton
          action="remove"
          description="Remove the selected item from its parent. This does not delete the item."
          shortcut={Sh.format(Sh.standard.removeFromParent)}
          icon="remove-r"
          label="Remove"
          context={props.context}
          name="remove"
          enabled={Ac.enabled(props.context, "remove")}
        />
        <ToolbarButton
          action="destroy"
          description="Permanently delete the selected item. If this item has other parents, it will be removed from *all* parents."
          shortcut={Sh.format(Sh.standard.delete)}
          icon="trash"
          label="Destroy"
          context={props.context}
          name="destroy"
          enabled={Ac.enabled(props.context, "destroy")}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Move">
        <ToolbarButton
          action="unindent"
          description="Unindent the selected item"
          shortcut={Sh.format(Sh.standard.unindent)}
          icon="push-chevron-left"
          label="Unindent"
          context={props.context}
          name="unindent"
          enabled={Ac.enabled(props.context, "unindent")}
        />
        <ToolbarButton
          action="indent"
          description="Indent the selected item"
          shortcut={Sh.format(Sh.standard.indent)}
          icon="push-chevron-right"
          label="Indent"
          context={props.context}
          name="indent"
          enabled={Ac.enabled(props.context, "indent")}
        />
        <ToolbarButton
          action="up"
          description="Move the selected item up"
          shortcut={Sh.format(Sh.standard.moveUp)}
          icon="push-chevron-up"
          label="Up"
          context={props.context}
          name="up"
          enabled={Ac.enabled(props.context, "up")}
        />
        <ToolbarButton
          action="down"
          description="Move the selected item down"
          shortcut={Sh.format(Sh.standard.moveDown)}
          icon="push-chevron-down"
          label="Down"
          context={props.context}
          name="down"
          enabled={Ac.enabled(props.context, "down")}
        />
      </ToolbarGroup>
      <ToolbarGroup title="Connect">
        <ToolbarButton
          action="insert-sibling"
          description="Insert an existing item as a sibling after the currently selected item."
          shortcut={Sh.format(Sh.standard.insertSibling)}
          icon="add"
          label="Sibling"
          context={props.context}
          name="insert-sibling"
          enabled={Ac.enabled(props.context, "insert-sibling")}
        />
        <ToolbarButton
          action="insert-child"
          description="Insert an existing item as a child of the currently selected item."
          shortcut={Sh.format(Sh.standard.insertChild)}
          icon="arrow-bottom-right-o"
          label="Child"
          context={props.context}
          name="insert-child"
          enabled={Ac.enabled(props.context, "insert-child")}
        />
        <ToolbarButton
          action="insert-parent"
          description="Insert an existing item as a parent of the currently selected item."
          shortcut={Sh.format(Sh.standard.insertParent)}
          icon="arrow-top-left-o"
          label="Parent"
          context={props.context}
          name="insert-parent"
          enabled={Ac.enabled(props.context, "insert-parent")}
        />
        <ToolbarButton
          action="insert-link"
          description="Insert a reference to an existing item at the position of the text."
          shortcut={Sh.format(Sh.standard.insertLink)}
          icon="file-document"
          label="Link"
          context={props.context}
          name="insert-link"
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
          name="tutorial"
          enabled={Ac.enabled(props.context, "tutorial")}
        />
        <ToolbarButton
          action="changelog"
          description="Show list of updates to Thinktool."
          icon="list"
          label="Updates"
          context={props.context}
          name="changelog"
          enabled={true}
        />
      </ToolbarGroup>
    </div>
  );
}
