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
  {name: "Reorganizing", introduces: ["remove", "destroy", "indent", "unindent", "up", "down"]},
  {name: "Flexible hierarchy", introduces: ["insert-sibling", "insert-child", "insert-parent"]},
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
      ) : props.state.step === "Reorganizing" ? (
        <StepReorganizing />
      ) : props.state.step === "Flexible hierarchy" ? (
        <StepFlexibleHierarchy />
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
        <i>Welcome to Thinktool! Let's get you started with the basics.</i>
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
        <i>Most buttons also have keyboard shortcuts. Hover over a button to see its shortcuts.</i>
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

export function StepReorganizing() {
  return (
    <>
      <p>
        <i>For Thinktool to be really useful, you should make sure to regularly go over your items.</i>
      </p>
      <p>
        <strong>Remove an item from its parent</strong> with
        <span className="fake-button">
          <span className="icon gg-remove-r"></span>Remove.
        </span>
        Note that this does <em>not</em> remove that item from the database, and if it exists in any other
        places, it can still be found there.
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

export function StepFlexibleHierarchy() {
  return (
    <>
      <p>
        <i>
          Let's say you're studying philosophy. You may want to add different areas of philosophy like ethics,
          epistemology and metaphysics as items in Thinktool. Then you can add important philosophers as
          children of those items, and then add each philosopher's notable ideas as children of that
          philosopher's item.
        </i>
      </p>
      <p>
        <i>
          But what if one philosopher has worked in multiple areas of philosophy? This is precisely why
          Thinktool let's you assign multiple parents to an item.
        </i>
      </p>
      <p>
        <strong>Make an existing item a parent</strong> of the currently selected item with
        <span className="fake-button">
          <span className="icon gg-arrow-top-left-o"></span>Parent.
        </span>
        <i>You can use this to easily add an item (the child) to some category (the parent).</i>
      </p>
      <p>
        <strong>Likewise,</strong> you can add an existing item as a sibling of the selected item with
        <span className="fake-button">
          <span className="icon gg-add"></span>Sibling
        </span>
        or as a child with
        <span className="fake-button">
          <span className="icon gg-arrow-bottom-right-o"></span>Child.
        </span>
      </p>
    </>
  );
}
