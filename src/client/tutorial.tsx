import * as React from "react";
import * as ReactDOM from "react-dom";

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

export function TutorialBox(props: {state: State; setState(state: State): void}) {
  return ReactDOM.createPortal(
    <div className="tutorial">
      <h1>{props.state.step}.</h1>
      {props.state.step === "Getting started" ? (
        <StepGettingStarted />
      ) : (
        <p>An error happened while loading the tutorial!</p>
      )}
    </div>,
    document.body,
  );
}

export function StepGettingStarted() {
  return (
    <>
      <p>Welcome to Thinktool! Let me teach you how to use it.</p>
      <p>
        <strong>Creating a couple of new items.</strong> You can do this by clicking the buttons in the
        toolbar. Use
        <span className="fake-button">
          <span className="icon gg-add-r"></span>New
        </span>
        and
        <span className="fake-button">
          <span className="icon gg-arrow-bottom-right-r"></span>New Child
        </span>
        to create a tree of items.
      </p>
      <p>You can hover over buttons to see what they do and what their keyboard shortcuts are.</p>
      <p>
        <strong>Organize your items.</strong> In Thinktool, one item can be in multiple places. Use the
        <span className="fake-button">
          <span className="icon gg-arrow-bottom-right-o"></span>Child
        </span>
        button to add an existing item as a child. Just search for the child by its content and select it from
        the popup menu.
      </p>
      <p>Notice how Thinktool automatically lets you know if an item is in multiple places.</p>
    </>
  );
}
