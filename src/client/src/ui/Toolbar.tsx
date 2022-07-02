import * as React from "react";

import * as A from "../app";
import * as Ic from "./icons";

type View = A.View["toolbar"];

const ToolbarButton = React.memo(
  function ToolbarButton(props: {send: A.Send; button: View["groups"][number]["actions"][number]}) {
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
          props.send({type: "action", action: props.button.action});
          ev.preventDefault();
        }}
        onClick={(ev) => {
          console.log("Clicked button %o", props.button.action);
          props.send({type: "action", action: props.button.action});
          ev.preventDefault();
        }}
        title={props.button.description}
        disabled={!props.button.isEnabled}
      >
        <Ic.IconLabel icon={props.button.icon}>{props.button.label}</Ic.IconLabel>
      </button>
    );
  },
  (prev, next) => prev.send === next.send && JSON.stringify(prev.button) === JSON.stringify(next.button),
);

const ToolbarGroup = React.memo(
  function ToolbarGroup(props: {send: A.Send; group: View["groups"][number]}) {
    return (
      <div className="toolbar-group named-toolbar-group">
        <h6>{props.group.title}</h6>
        <div>
          {props.group.actions.map((button) => (
            <ToolbarButton key={button.action} send={props.send} button={button} />
          ))}
        </div>
      </div>
    );
  },
  (prev, next) => prev.send === next.send && JSON.stringify(prev.group) === JSON.stringify(next.group),
);

export const Toolbar = React.memo(
  function Toolbar(props: {send: A.Send; toolbar: View}) {
    return (
      <div className="toolbar">
        {props.toolbar.groups.map((group) => (
          <ToolbarGroup key={group.title} send={props.send} group={group} />
        ))}
      </div>
    );
  },
  (prev, next) => prev.send === next.send && JSON.stringify(prev.toolbar) === JSON.stringify(next.toolbar),
);
