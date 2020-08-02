import * as React from "react";

import {ActionName} from "./actions";
import {ExternalLink} from "./ui/ExternalLink";

export type State = {step: string; finished: boolean};

const initialState = {step: "Getting started", finished: false};

export function initialize(finished: boolean) {
  if (!finished) return initialState;
  return {step: "Getting started", finished: true};
}

const steps: {name: string; introduces: ActionName[]}[] = [
  {name: "Getting started", introduces: ["new", "new-child"]},
  {name: "Multiple parents", introduces: ["insert-child", "insert-sibling", "insert-parent"]},
  {name: "Reorganizing", introduces: ["remove", "destroy", "indent", "unindent", "up", "down"]},
  {name: "Bidirectional linking", introduces: ["insert-link"]},
  {name: "Navigation", introduces: ["find", "zoom", "home"]},
  {name: "The end", introduces: ["tutorial"]},
];

export function isActive(state: State): boolean {
  return !state.finished;
}

export function reset(state: State): State {
  return initialState;
}

export function isRelevant(state: State, name: ActionName): boolean {
  if (!isActive(state)) return false;

  let relevant: ActionName[] = [];
  for (const step of steps) {
    if (step.name === state.step) relevant = step.introduces;
  }
  return relevant.includes(name);
}

export function isNotIntroduced(state: State, name: ActionName): boolean {
  if (!isActive(state)) return false;

  let introduced: ActionName[] = [];
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
  return {...state, step: steps[index + 1].name};
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
  return {...state, step: steps[index - 1].name};
}

export function NextStep(props: {state: State; setState(state: State): void}) {
  if (hasNextStep(props.state)) {
    return <button onClick={() => props.setState(nextStep(props.state))}>Next Step &gt;</button>;
  } else {
    return <button onClick={() => props.setState({...props.state, finished: true})}>Close &gt;</button>;
  }
}

export function TutorialBox(props: {state: State; setState(state: State): void}) {
  if (props.state.finished) return null;

  return (
    <div className="tutorial">
      <h1>
        {props.state.step}{" "}
        <span className="step">
          (Step {stepIndex(props.state) + 1} of {amountSteps(props.state)})
        </span>
      </h1>
      {props.state.step === "Getting started" ? (
        <StepGettingStarted />
      ) : props.state.step === "Reorganizing" ? (
        <StepReorganizing />
      ) : props.state.step === "Multiple parents" ? (
        <StepFlexibleHierarchy />
      ) : props.state.step === "Bidirectional linking" ? (
        <StepBidirectionalLinks />
      ) : props.state.step === "Navigation" ? (
        <StepStayingFocused />
      ) : props.state.step === "The end" ? (
        <StepHaveFun />
      ) : (
        <p>An error happened while loading the tutorial!</p>
      )}
      <div className="tutorial-navigation">
        <button
          onClick={() => props.setState(previousStep(props.state))}
          disabled={!hasPreviousStep(props.state)}>
          &lt; Back
        </button>
        <NextStep {...props} />
      </div>
    </div>
  );
}

export function StepHowToUseThinktool() {
  return (
    <>
      <p>
        <i>Welcome to Thinktool!</i>
      </p>
      <p>
        For a more thorough introduction, you can also check out this guide:{" "}
        <ExternalLink className="important-link" href="/tutorial.html">
          How to use Thinktool
        </ExternalLink>
      </p>
      <p>
        <i>
          This tutorial is a work-in-progress. I'd like to hear your feedback about it. If there's anything
          you found unclear, please{" "}
          <a className="email" href="mailto:jonas@thinktool.io">
            let me know
          </a>
          .
        </i>
      </p>
    </>
  );
}

export function StepGettingStarted() {
  return (
    <>
      <p>
        <i>Let's start with the basics.</i>
      </p>
      <p>
        The outline contains <em>items</em>. Click on an item to focus it, and then try editing its content.
      </p>
      <p>
        <strong>Create some items.</strong> Focus an existing item by clicking on it, and then play around
        with
        <span className="fake-button">
          <span className="icon fas fa-plus-square"></span>New
        </span>
        and
        <span className="fake-button">
          <span className="icon fas fa-caret-square-down"></span>New Child
        </span>
        in the toolbar to create a tree of items.
      </p>
      <p>
        <i>Most buttons also have keyboard shortcuts. Hover over a button to see its shortcuts.</i>
      </p>
      <p>
        <strong>Collapse and expand</strong> items by clicking the bullet next to them. Items with hidden
        children will have a darker bullet.
      </p>
    </>
  );
}

export function StepReorganizing() {
  return (
    <>
      <p>
        <i>Now that you have some items, try reorganizing them.</i>
      </p>
      <p>
        <strong>Remove an item from its parent</strong> with
        <span className="fake-button">
          <span className="icon fas fa-minus-square"></span>Remove.
        </span>
        This does <em>not</em> remove that item from the database, so if it has any other parents, you can
        still find it there.
      </p>
      <p>
        <strong>To completely delete an item,</strong> use{" "}
        <span className="fake-button">
          <span className="icon fas fa-trash"></span>Destroy
        </span>
        instead. This removes the item from all its parents, and permanently deletes it from the database.
      </p>
      <p>
        <strong>Reorder items</strong> with
        <span className="fake-button">
          <span className="icon fas fa-chevron-up"></span>Up
        </span>
        and
        <span className="fake-button">
          <span className="icon fas fa-chevron-right"></span>Down
        </span>
        , or use
        <span className="fake-button">
          <span className="icon fas fa-chevron-left"></span>Unindent
        </span>
        and
        <span className="fake-button">
          <span className="icon fas fa-chevron-right"></span>Indent
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
          Thinktool lets you have more than one parent for each item. You can find the item under all of its
          parents.
        </i>
      </p>
      <p>
        <strong>Connect an existing item as a parent of the currently focused item.</strong> To do this, click
        on an item to focus it, click{" "}
        <span className="fake-button">
          <span className="icon fas fa-chevron-circle-up"></span>Parent,
        </span>
        and then type some of the content of the existing item that you want to add as a parent.
      </p>
      <p>Now you can find the original item under both its parents!</p>
      <p>
        <i>
          In Thinktool, you can use parents like tags, keywords or categories in other note-taking
          applications.
        </i>
      </p>
      <p>
        <strong>You can also</strong> add an existing item as a sibling of the focused item with
        <span className="fake-button">
          <span className="icon fas fa-plus-circle"></span>Sibling
        </span>
        or as a child with
        <span className="fake-button">
          <span className="icon fas fa-chevron-circle-down"></span>Child.
        </span>
      </p>
      <p>
        <i>
          By the way, notice how Thinktool automatically shows you other parents for each item. This can
          sometimes help you find items that are related to the one you're looking at.
        </i>
      </p>
    </>
  );
}

export function StepBidirectionalLinks() {
  return (
    <>
      <p>
        <i>Thinktool has bidirectional links like Roam Research or Obsidian.</i>
      </p>
      <p>
        <strong>Try adding a link</strong> by first placing your cursor inside an item, and then pressing the
        <span className="fake-button">
          <span className="icon fas fa-link"></span>Link
        </span>
        button. Type the name of another item and select it.
      </p>
      <p>
        This will insert some nonsense like "#q3kmmx8" at your cursor – don't worry about it, that's just how
        links are represented in Thinktool. Unfocus the item you're editing by clicking somewhere else to see
        the link.
      </p>
      <p>
        <strong>Expand the link.</strong> Just click on the bullet inside the link. You can see the linked
        item, its children and its parents directly in the outline.
      </p>
      <p>
        <i>
          Thinktool automatically shows you all the places where a given item is linked, called its
          "references". Links in Thinktool are bidirectional, because you can follow them in both directions.
        </i>
      </p>
    </>
  );
}

export function StepStayingFocused() {
  return (
    <>
      <p>
        <i>
          Your workspace can quickly get cluttered when following links or looking at parents. You can jump to
          items to show them in an expanded view.
        </i>
      </p>
      <p>
        <strong>To jump to a link,</strong> simply middle click or shift click the link. The linked item will
        then open in an expanded view, showing just that item.
      </p>
      <p>
        <strong>In fact, you can jump to any item.</strong> First focus the item by clicking on it, and then
        press
        <span className="fake-button">
          <span className="icon fas fa-hand-point-right"></span>Jump.
        </span>
      </p>
      <p>
        <strong>If you get lost,</strong> you can always go back to the default item with{" "}
        <span className="fake-button">
          <span className="icon fas fa-home"></span>Home.
        </span>
      </p>
      <p>
        <strong>You can also find a specific item</strong> using the
        <span className="fake-button">
          <span className="icon fas fa-search"></span>Find
        </span>
        button. Just search for an item by its content, and then select it to jump there.
      </p>
    </>
  );
}

export function StepHaveFun() {
  return (
    <>
      <p>
        <i>That's it! I hope you find Thinktool useful.</i>
      </p>
      <p>
        <strong>If you want to do the tutorial again,</strong> just press the
        <span className="fake-button">
          <span className="icon fas fa-info"></span>Tutorial
        </span>{" "}
        button.
      </p>
      <p>
        This tutorial is a work-in-progress. I'd love to hear your feedback – just send me an email at{" "}
        <a className="email" href="mailto:jonas@thinktool.io">
          jonas@thinktool.io
        </a>
        . You're also welcome to email me for any other reason!
      </p>
      <p>
        <i>Thanks for trying out Thinktool!</i>
      </p>
    </>
  );
}
