import * as React from "react";

import {ActionName} from "./actions";
import {ExternalLink} from "./ui/ExternalLink";

export type State = {step: string; finished: boolean};

const initialState = {step: "How to use Thinktool", finished: false};

export function initialize(finished: boolean) {
  if (!finished) return initialState;
  return {step: "How to use Thinktool", finished: true};
}

const steps: {name: string; introduces: ActionName[]}[] = [
  {name: "How to use Thinktool", introduces: []},
  {name: "Getting started", introduces: ["new", "new-child", "insert-child"]},
  {name: "Reorganizing", introduces: ["remove", "destroy", "indent", "unindent", "up", "down"]},
  {name: "Flexible hierarchy", introduces: ["insert-sibling", "insert-child", "insert-parent"]},
  {name: "Bidirectional linking", introduces: ["insert-link"]},
  {name: "Staying focused", introduces: ["find", "zoom"]},
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
        {props.state.step}.{" "}
        <span className="step">
          (Step {stepIndex(props.state) + 1} of {amountSteps(props.state)})
        </span>
      </h1>
      {props.state.step === "How to use Thinktool" ? (
        <StepHowToUseThinktool />
      ) : props.state.step === "Getting started" ? (
        <StepGettingStarted />
      ) : props.state.step === "Reorganizing" ? (
        <StepReorganizing />
      ) : props.state.step === "Flexible hierarchy" ? (
        <StepFlexibleHierarchy />
      ) : props.state.step === "Bidirectional linking" ? (
        <StepBidirectionalLinks />
      ) : props.state.step === "Staying focused" ? (
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
        <i>Now, let's get started with the basics.</i>
      </p>
      <p>
        <strong>Create a couple of new items.</strong> You can do this by clicking the buttons in the toolbar.
        Select an existing item, and then use
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
        <strong>Structure your items.</strong> In Thinktool, one item can be in multiple places. Use the
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
        <i>For Thinktool to be really useful, try to keep your database clean and organized.</i>
      </p>
      <p>
        <strong>Remove an item from its parent</strong> with
        <span className="fake-button">
          <span className="icon gg-remove-r"></span>Remove.
        </span>
        Note that this does <em>not</em> remove that item from the database, so if it exists in any other
        places, it can still be found there.
      </p>
      <p>
        <strong>To completely delete an item,</strong> use{" "}
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
        <i>Let's say you're studying philosophy and want to take notes about what you read.</i>
      </p>
      <p>
        <i>
          You may want to add different areas of philosophy like ethics, epistemology and metaphysics as items
          in Thinktool. Then you can add important philosophers under those items, then the books they've
          authored, and then your notes.
        </i>
      </p>
      <p>
        <i>
          But what if one philosopher has worked in multiple areas of philosophy? This is where Thinktool
          shines, because Thinktool lets you put one item in multiple places at the same time.
        </i>
      </p>
      <p>
        <strong>Make an existing item a parent</strong> of the currently selected item with
        <span className="fake-button">
          <span className="icon gg-arrow-top-left-o"></span>Parent.
        </span>
        Now you can find that item under both its parents.
      </p>
      <p>
        <i>
          Tip: You can also use parents to categorize items, so you can easily find them again &ndash; like
          tags in other apps.
        </i>
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

export function StepBidirectionalLinks() {
  return (
    <>
      <p>
        <i>
          Sometimes it doesn't really make sense to organize items into trees. Links let you describe loose
          relationships between your items.
        </i>
      </p>
      <p>
        <strong>Try adding a link</strong> by first placing your cursor inside an item, and then pressing the
        <span className="fake-button">
          <span className="icon gg-file-document"></span>Link
        </span>
        button. Type the name of an existing item or create a new item.
      </p>
      <p>After creating a link, deselect the item. Now you can click the link to show the linked item.</p>
      <p>
        Notice how thinktool automatically shows you all the places where a given item is linked, called its{" "}
        <em>references</em>. Links in Thinktool are <em>bidirectional</em>, because you can follow them in
        both directions.
      </p>
    </>
  );
}

export function StepStayingFocused() {
  return (
    <>
      <p>
        <i>You probably don't want to always see every item in your database.</i>
      </p>
      <p>
        <strong>Navigate to an item</strong> by selecting it, and then pressing
        <span className="fake-button">
          <span className="icon gg-maximize-alt"></span>Zoom.
        </span>
        Now you can see that item's parents and children, as well as any references to it, in an expanded
        view.
      </p>
      <p>
        <strong>Find a specific item</strong> using the
        <span className="fake-button">
          <span className="icon gg-search"></span>Find
        </span>
        button. Here you can search for an item by its content. Select an item to go straight to it.
      </p>
      <p>You can also use this to create a new item that is not connected to any other items.</p>
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
          <span className="icon gg-info"></span>Tutorial
        </span>{" "}
        button.
      </p>
      <p>
        <i>
          If you need any help, have feedback or want to submit a bug report or feature request, you are more
          than welcome to send me an email at{" "}
          <a className="email" href="mailto:jonas@thinktool.io">
            jonas@thinktool.io
          </a>
        </i>
      </p>
      <p>
        <i>Thanks for trying out Thinktool!</i>
      </p>
    </>
  );
}
