import * as React from "react";
import * as T from "../tree";
import * as Tutorial from "../tutorial";
import {Context} from "../context";
import Search from "./Search";
import {actionsWith} from "../actions";

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
  action: () => void;
  description: string;
  shortcut: string;
  icon: string;
  label: string;
  target: T.NodeRef | null;
  name: Tutorial.FunctionName;
  context: Context;
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
      onClick={() => {
        if (props.target === null) console.warn("Skipping action from toolbar because of missing target");
        props.action();
      }}
      title={`${props.description} [${props.shortcut}]`}
      disabled={props.target === null}>
      <span className={`icon gg-${props.icon}`}></span>
      {props.label}
    </button>
  );
}

export default function Toolbar(props: {context: Context}) {
  // The actions in the toolbar use the currently focused item to figure out how
  // they should act. Unfortunately, this item is unfocused when the content box
  // is blurred. To work around this issue, we just remember the last focused
  // item, and then we always apply the actions to this item.
  //
  // This "target" item should be exactly the focused item, except for the
  // duration between a button on the toolbar being focused and that button
  // being activated. We use 'onPointerDown', which is triggered before the
  // toolbar gains focus and 'onPointerUp', which is triggered after the
  // button's 'onClick' event.

  const [toolbarActive, setToolbarActive] = React.useState<boolean>(false);
  const [target, setTarget] = React.useState<T.NodeRef | null>(null);

  React.useEffect(() => {
    let toolbarActive_ = toolbarActive;

    // Partial workaround for bug where 'toolbarActive' is sometimes wrong.
    if (T.focused(props.context.tree) !== null) {
      setToolbarActive(false);
      toolbarActive_ = false;
    }

    if (!toolbarActive_) setTarget(T.focused(props.context.tree));
  }, [T.focused(props.context.tree)]);

  function actions() {
    if (target === null) {
      throw "No target, so cannot handle actions";
    }
    return actionsWith(props.context, target);
  }

  return (
    <div
      className="toolbar"
      onPointerDown={() => setToolbarActive(true)}
      onPointerUp={() => setToolbarActive(false)}>
      <ToolbarGroup title="Navigate">
        <Search context={props.context} />
        <ToolbarButton
          action={() => {
            actions().zoom();
          }}
          description="Zoom in on selected item"
          shortcut="middle click bullet"
          icon="maximize-alt"
          label="Zoom"
          target={target}
          context={props.context}
          name="zoom"
        />
      </ToolbarGroup>
      <ToolbarGroup title="Item">
        <ToolbarButton
          action={() => {
            actions().createSiblingAfter();
          }}
          description="Create a new item as a sibling of the currently selected item"
          shortcut="enter/ctrl+enter"
          icon="add-r"
          label="New"
          target={target}
          context={props.context}
          name="new"
        />
        <ToolbarButton
          action={() => {
            actions().createChild();
          }}
          description="Create a new child of the selected item"
          shortcut="alt+enter"
          icon="arrow-bottom-right-r"
          label="New Child"
          target={target}
          context={props.context}
          name="new-child"
        />
        <ToolbarButton
          action={() => {
            actions().removeFromParent();
          }}
          description="Remove the selected item from its parent. This does not delete the item."
          shortcut="alt+backspace"
          icon="remove-r"
          label="Remove"
          target={target}
          context={props.context}
          name="remove"
        />
        <ToolbarButton
          action={() => {
            actions().clone();
          }}
          description="Create a copy of the selected item"
          shortcut="ctrl+mouse drag"
          icon="duplicate"
          label="Clone"
          target={target}
          context={props.context}
          name="clone"
        />
        <ToolbarButton
          action={() => {
            actions().delete();
          }}
          description="Permanently delete the selected item. If this item has other parents, it will be removed from *all* parents."
          shortcut="alt+delete"
          icon="trash"
          label="Destroy"
          target={target}
          context={props.context}
          name="destroy"
        />
      </ToolbarGroup>
      <ToolbarGroup title="Move">
        <ToolbarButton
          action={() => {
            actions().unindent();
          }}
          description="Unindent the selected item"
          shortcut="ctrl+alt+left"
          icon="push-chevron-left"
          label="Unindent"
          target={target}
          context={props.context}
          name="unindent"
        />
        <ToolbarButton
          action={() => {
            actions().indent();
          }}
          description="Indent the selected item"
          shortcut="ctrl+alt+right"
          icon="push-chevron-right"
          label="Indent"
          target={target}
          context={props.context}
          name="indent"
        />
        <ToolbarButton
          action={() => {
            actions().moveUp();
          }}
          description="Move the selected item up"
          shortcut="ctrl+alt+up"
          icon="push-chevron-up"
          label="Up"
          target={target}
          context={props.context}
          name="up"
        />
        <ToolbarButton
          action={() => {
            actions().moveDown();
          }}
          description="Move the selected item down"
          shortcut="ctrl+alt+down"
          icon="push-chevron-down"
          label="Down"
          target={target}
          context={props.context}
          name="down"
        />
      </ToolbarGroup>
      <ToolbarGroup title="Connect">
        <ToolbarButton
          action={() => {
            actions().showSiblingPopup();
          }}
          description="Insert an existing item as a sibling after the currently selected item."
          shortcut="alt+s"
          icon="add"
          label="Sibling"
          target={target}
          context={props.context}
          name="insert-sibling"
        />
        <ToolbarButton
          action={() => {
            actions().showChildPopup();
          }}
          description="Insert an existing item as a child of the currently selected item."
          shortcut="alt+c"
          icon="arrow-bottom-right-o"
          label="Child"
          target={target}
          context={props.context}
          name="insert-child"
        />
        <ToolbarButton
          action={() => {
            actions().showParentPopup();
          }}
          description="Insert an existing item as a parent of the currently selected item."
          shortcut="alt+p"
          icon="arrow-top-left-o"
          label="Parent"
          target={target}
          context={props.context}
          name="insert-parent"
        />
        <ToolbarButton
          action={() => {
            actions().showLinkPopup();
          }}
          description="Insert a reference to an existing item at the position of the text."
          shortcut="alt+l"
          icon="file-document"
          label="Link"
          target={target}
          context={props.context}
          name="insert-link"
        />
      </ToolbarGroup>
      <ToolbarGroup title="Child type">
        <ToolbarButton
          action={() => {
            actions().showTagPopup();
          }}
          description="Set the connection type. (Use table mode on an item whose children's children have connection types set.)"
          shortcut="alt+t"
          target={target}
          icon="extension-add"
          label="Set"
          context={props.context}
          name="set-child-type"
        />
        <ToolbarButton
          action={() => {
            actions().untag();
          }}
          description="Revert to the default connection type. [alt+shift+t]"
          shortcut="alt+t"
          target={target}
          icon="extension-remove"
          label="Reset"
          context={props.context}
          name="reset-child-type"
        />
      </ToolbarGroup>
    </div>
  );
}
