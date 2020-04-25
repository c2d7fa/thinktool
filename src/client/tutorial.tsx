import * as React from "react";
import * as ReactDOM from "react-dom";

import * as G from "../shared/general";

export type State = {step: string};

export type FunctionName =
  | "find"
  | "zoom"
  | "new"
  | "new-child"
  | "remove"
  | "clone"
  | "destroy"
  | "unindent"
  | "indent"
  | "up"
  | "down"
  | "insert-sibling"
  | "insert-child"
  | "insert-parent"
  | "insert-link"
  | "set-child-type"
  | "reset-child-type";

export const initialState = {step: "Getting started"};

const steps: {name: string; introduces: FunctionName[]}[] = [
  {name: "Getting started", introduces: ["new", "new-child", "insert-child"]},
  {name: "Gardening", introduces: ["remove", "destroy", "indent", "unindent", "up", "down"]},
];

export function isRelevant(state: State, name: FunctionName): boolean {
  let relevant: FunctionName[] = [];
  for (const step of steps) {
    if (step.name === state.step) relevant = step.introduces;
  }
  return relevant.includes(name);
}

export function isNotIntroduced(state: State, name: FunctionName): boolean {
  let introduced: FunctionName[] = [];
  for (const step of steps) {
    introduced = [...introduced, ...step.introduces];
    if (step.name === state.step) break;
  }
  return !introduced.includes(name);
}

function stepIndex(state: State): number {
  return steps.map((s) => s.name).indexOf(state.step);
}

function amountSteps(state: State): number {
  return steps.length;
}

function hasNextStep(state: State): boolean {
  return steps.length - 1 > stepIndex(state);
}

function nextStep(state: State): State {
  if (!hasNextStep(state)) return state;

  let index = 0;
  for (const step of steps) {
    if (step.name === state.step) break;
    index++;
  }
  return {step: steps[index + 1].name};
}

function hasPreviousStep(state: State): boolean {
  return stepIndex(state) > 0;
}

function previousStep(state: State): State {
  if (!hasPreviousStep(state)) return state;

  let index = 0;
  for (const step of steps) {
    if (step.name === state.step) break;
    index++;
  }
  return {step: steps[index - 1].name};
}

export function TutorialBox(props: {state: State; setState(state: State): void}) {
  return ReactDOM.createPortal(
    <div className="tutorial">
      <h1>
        {props.state.step}.{" "}
        <span className="step">
          (Step {stepIndex(props.state) + 1} of {amountSteps(props.state)})
        </span>
      </h1>
      {props.state.step === "Getting started" ? (
        <StepGettingStarted />
      ) : props.state.step === "Gardening" ? (
        <StepGardening />
      ) : (
        <p>An error happened while loading the tutorial!</p>
      )}
      <div className="tutorial-navigation">
        <button
          onClick={() => props.setState(previousStep(props.state))}
          disabled={!hasPreviousStep(props.state)}>
          &lt; Back
        </button>
        <button onClick={() => props.setState(nextStep(props.state))} disabled={!hasNextStep(props.state)}>
          Next Step &gt;
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function StepGettingStarted() {
  return (
    <>
      <p>
        <i>Welcome to Thinktool! Let's start by learning the basics.</i>
      </p>
      <p>
        <strong>Create a couple of new items.</strong> You can do this by clicking the buttons in the toolbar.
        Select an item, and then use
        <span className="fake-button">
          <span className="icon gg-add-r"></span>New
        </span>
        and
        <span className="fake-button">
          <span className="icon gg-arrow-bottom-right-r"></span>New Child
        </span>
        to create a tree of items.
      </p>
      <p>
        <i>You can hover over buttons to see what they do and what their keyboard shortcuts are.</i>
      </p>
      <p>
        <strong>Organize your items.</strong> In Thinktool, one item can be in multiple places. Use the
        <span className="fake-button">
          <span className="icon gg-arrow-bottom-right-o"></span>Child
        </span>
        button to add an existing item as a child. Just search for the child by its content and select it from
        the popup menu.
      </p>
      <p>
        <i>Notice how Thinktool automatically lets you know that an item is in multiple places.</i>
      </p>
    </>
  );
}

export function StepGardening() {
  return (
    <>
      <p>
        <i>For Thinktool to be really useful, you should make sure to regularly organize your items.</i>
      </p>
      <p>
        <strong>Remove an item from its parent</strong> with
        <span className="fake-button">
          <span className="icon gg-remove-r"></span>Remove.
        </span>
        Note that this does <em>not</em> remove that item from the database, and if it has any other parents,
        it can still be found there.
      </p>
      <p>
        <strong>To completely delete an item,</strong> use
        <span className="fake-button">
          <span className="icon gg-trash"></span>Destroy
        </span>
        instead. This removes the item from all its parents, and permanently deletes it from the database.
      </p>
      <p>
        <strong>Reorder items</strong> with
        <span className="fake-button">
          <span className="icon gg-push-chevron-up"></span>Up
        </span>
        and
        <span className="fake-button">
          <span className="icon gg-push-chevron-down"></span>Down
        </span>
        , or use
        <span className="fake-button">
          <span className="icon gg-push-chevron-left"></span>Unindent
        </span>
        and
        <span className="fake-button">
          <span className="icon gg-push-chevron-right"></span>Indent
        </span>
        to reorganize items among their neighbours.
      </p>
    </>
  );
}
