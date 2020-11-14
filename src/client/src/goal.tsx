import * as React from "react";

import * as D from "./data";
import * as T from "./tree";
import * as A from "./actions";

export type ActionEvent = {action: A.ActionName; state: D.State; tree: T.Tree; target: T.NodeRef | null};

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

export function action(state: State, event: ActionEvent): State {
  if (event.action === "insert-parent") {
    const finished = new Set(state.finished);
    finished.add("add-parent");
    return {...state, finished};
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
