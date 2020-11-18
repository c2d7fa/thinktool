import * as React from "react";

import * as D from "./data";
import * as T from "./tree";
import * as A from "./actions";

export type ActionEvent =
  | {action: "created-item"}
  | {
      action: "inserted-parent";
      newState: D.State;
      newTree: T.Tree;
      childNode: T.NodeRef;
    };

export type GoalId = "create-item" | "add-parent";

type GoalData = {title: string; help: JSX.Element};

export type State = {finished: Set<GoalId>};

function data(id: GoalId): GoalData {
  const data = new Map<GoalId, GoalData>();

  data.set("create-item", {title: "Create a new item", help: <span>TODO 1</span>});
  data.set("add-parent", {title: "Add multiple parents to a single item", help: <span>TODO 2</span>});

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
  } else {
    return state;
  }
}

export function EmbeddedGoal(props: {id: GoalId; state: State}) {
  if (props.state.finished.has(props.id)) {
    return (
      <strong>
        Goal: <s>{data(props.id).title}</s>
      </strong>
    );
  } else {
    return (
      <strong>
        Goal: <i>{data(props.id).title}</i>
      </strong>
    );
  }
}
