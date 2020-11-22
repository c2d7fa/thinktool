import {classes} from "@johv/miscjs";
import * as React from "react";

import * as D from "./data";
import * as T from "./tree";

export type ActionEvent =
  | {action: "created-item"}
  | {
      action: "inserted-parent";
      newState: D.State;
      newTree: T.Tree;
      childNode: T.NodeRef;
    }
  | {action: "toggled-item", newTree: T.Tree, node: T.NodeRef};

export type GoalId = "create-item" | "add-parent" | "expand-item";

type GoalData = {title: string};

export type State = {finished: Set<GoalId>};

function data(id: GoalId): GoalData {
  const data = new Map<GoalId, GoalData>();

  data.set("create-item", {title: "Create a new item."});
  data.set("add-parent", {title: "Add a second parent to an item."});
  data.set("expand-item", {title: "Expand an item to see its children."});

  const result = data.get(id);
  if (result === undefined) throw "oops";
  return result;
}

export const initialState: State = {finished: new Set()};

function finishGoal(state: State, goal: GoalId): State {
  const finished = new Set(state.finished);
  finished.add(goal);
  return {...state, finished};
}

export function action(state: State, event: ActionEvent): State {
  if (
    event.action === "inserted-parent" &&
    D.parents(event.newState, T.thing(event.newTree, event.childNode)).length > 1
  ) {
    return finishGoal(state, "add-parent");
  } else if (event.action === "created-item") {
    return finishGoal(state, "create-item");
  } else if (
    event.action === "toggled-item" &&
    T.expanded(event.newTree, event.node) &&
    T.children(event.newTree, event.node).length >= 1
  ) {
    return finishGoal(state, "expand-item");
  } else {
    return state;
  }
}

export function EmbeddedGoal(props: {id: GoalId; state: State}) {
  const finished = props.state.finished.has(props.id);
  return (
    <span className={classes({goal: true, "goal-finished": finished})}>
      <i className="fas fa-pen" />
      <span>{data(props.id).title}</span>
    </span>
  );
}
