import * as React from "react";
import * as Misc from "@johv/miscjs";

import * as T from "../tree";
import {DragInfo} from "../context";

import {NodeStatus} from "../node-status";

import Bullet from "./Bullet";

// An item in the outline that represents a particular node in the tree. This is
// a general component that takes the list of other parents, the subtree and
// even the content editor components as props.
export default function Item(props: {
  node: T.NodeRef;
  parent?: T.NodeRef;

  dragInfo: DragInfo;
  beginDrag(): void;

  kind: "child" | "reference" | "opened-link" | "parent";
  status: NodeStatus;

  toggle(): void;
  jump(): void;

  otherParents: React.ReactNode;
  subtree: React.ReactNode;
  content: React.ReactNode;
}) {
  const [onBulletClick, onBulletMiddleClick] =
    props.kind === "parent" ? [props.jump, props.toggle] : [props.toggle, props.jump];

  const className = Misc.classes({
    item: true,
    "drop-target": props.dragInfo.current !== null && props.dragInfo.target?.id === props.node.id,
    "drag-source": props.dragInfo.current?.id === props.node.id && props.dragInfo.target !== null,
    "opened-link": props.kind === "opened-link",
  });

  return (
    <li className="subtree-container">
      {/* data-id is used for drag and drop. */}
      <div className={className} data-id={props.node.id}>
        {props.otherParents}
        <Bullet
          specialType={props.kind === "child" ? undefined : props.kind}
          beginDrag={props.beginDrag}
          status={props.status}
          toggle={onBulletClick}
          onMiddleClick={onBulletMiddleClick}
        />
        {props.content}
      </div>
      {props.status === "expanded" && props.subtree}
    </li>
  );
}
