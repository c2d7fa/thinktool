import * as React from "react";

import {ActionName} from "./actions";
import {ExternalLink} from "./ui/ExternalLink";

import * as G from "./goal";
import {IconId, IconLabel} from "./ui/icons";

export type State = {step: string; finished: boolean; goal: G.State};

const initialState = {step: "Getting started", finished: false, goal: G.initialState};

export function initialize(finished: boolean) {
  if (!finished) return initialState;
  return {step: "Getting started", finished: true, goal: G.initialState};
}

export function action(state: State, event: G.ActionEvent) {
  return {...state, goal: G.action(state.goal, event)};
}

export function isGoalFinished(state: State, goal: G.GoalId) {
  return G.isFinished(state.goal, goal);
}

const steps: {name: string; introduces: ActionName[]}[] = [
  {name: "Getting started", introduces: ["new", "new-child"]},
  {name: "Multiple parents", introduces: ["insert-child", "insert-sibling", "insert-parent"]},
  {name: "Bidirectional linking", introduces: ["insert-link"]},
  {name: "Reorganizing", introduces: ["remove", "destroy", "indent", "unindent", "up", "down"]},
  {name: "Navigation", introduces: ["find", "zoom", "home"]},
  {name: "The end", introduces: ["tutorial", "forum"]},
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
        <StepGettingStarted goalState={props.state.goal} />
      ) : props.state.step === "Reorganizing" ? (
        <StepReorganizing goalState={props.state.goal} />
      ) : props.state.step === "Multiple parents" ? (
        <StepFlexibleHierarchy goalState={props.state.goal} />
      ) : props.state.step === "Bidirectional linking" ? (
        <StepBidirectionalLinks goalState={props.state.goal} />
      ) : props.state.step === "Navigation" ? (
        <StepStayingFocused goalState={props.state.goal} />
      ) : props.state.step === "The end" ? (
        <StepHaveFun />
      ) : (
        <p>An error happened while loading the tutorial!</p>
      )}
      <div className="tutorial-navigation">
        <button onClick={() => props.setState(previousStep(props.state))} disabled={!hasPreviousStep(props.state)}>
          &lt; Back
        </button>
        <NextStep {...props} />
      </div>
    </div>
  );
}

function FakeButton(props: {label: string; icon: IconId}) {
  return (
    <span className="fake-button">
      <IconLabel icon={props.icon}>{props.label}</IconLabel>
    </span>
  );
}

export function StepGettingStarted(props: {goalState: G.State}) {
  return (
    <>
      <p>
        <i>Let's start with the basics.</i>
      </p>
      <p>
        The outline contains <em>items</em>. You can press <FakeButton icon="new" label="New" /> and{" "}
        <FakeButton icon="newChild" label="New Child" /> on the toolbar to create a some items.
      </p>
      <p>
        <G.EmbeddedGoal id="create-item" state={props.goalState} />
      </p>
      <p>
        Items that have a filled bullet next to them have hidden children. You can expand an item by clicking on
        its bullet.
      </p>
      <p>
        <G.EmbeddedGoal id="expand-item" state={props.goalState} />
      </p>
      <p>
        <i>
          Tip: Most buttons on the toolbar also have keyboard shortcuts. Hover over a button to see its shortcuts.
        </i>
      </p>
    </>
  );
}

export function StepReorganizing(props: {goalState: G.State}) {
  return (
    <>
      <p>
        <i>
          Curation is the key to a useful library of notes. Delete notes you don't use, and move old notes to where
          they belong.
        </i>
      </p>
      <p>
        To delete an item you no longer care about from the database, use{" "}
        <FakeButton icon="destroy" label="Destroy" />. This deletes the item permanently.
      </p>
      <p>
        <G.EmbeddedGoal id="delete-item" state={props.goalState} />
      </p>
      <p>
        You can also remove an item from its parent <em>without</em> deleting it from the database with{" "}
        <FakeButton icon="remove" label="Remove" />. If the item has any other parents, you can still find it
        there.
      </p>
      <p>
        <G.EmbeddedGoal id="remove-item" state={props.goalState} />
      </p>
      <p>
        You can use <FakeButton icon="up" label="Up" />,
        <FakeButton icon="down" label="Down" />,
        <FakeButton icon="unindent" label="Unindent" /> and <FakeButton icon="indent" label="Indent" /> to
        reorganize items among their neighbours.
      </p>
      <p>
        <G.EmbeddedGoal id="move-item" state={props.goalState} />
      </p>
      <p>
        <i>
          Tip: Don't forget that you can have the same item in multiple places. Sometimes it makes more sense to
          add a parent instead of moving a item.
        </i>
      </p>
    </>
  );
}

export function StepFlexibleHierarchy(props: {goalState: G.State}) {
  return (
    <>
      <p>
        <i>
          Thinktool lets you have more than one parent for each item. You can find the item under all of its
          parents.
        </i>
      </p>
      <p>
        To add a second parent to an existing item, first click on an item to focus it. Then click{" "}
        <FakeButton icon="insertParent" label="Parent" />, and search for another item that you want to add as a
        parent.
      </p>
      <p>
        <G.EmbeddedGoal id="add-parent" state={props.goalState} />
      </p>
      <p>
        Notice how a little green box showed up above the item? You can click on it to go to the other parent. Just
        use the back button in your browser to go back.
      </p>
      <p>
        <i>Tip: Where you would use a tag in another note-taking app, you can add a parent in Thinktool insead.</i>
      </p>
      <p>
        You can also add an existing item as a sibling of the focused item with{" "}
        <FakeButton icon="insertSibling" label="Sibling" /> or as a child with{" "}
        <FakeButton icon="insertChild" label="Child" />.
      </p>
    </>
  );
}

export function StepBidirectionalLinks(props: {goalState: G.State}) {
  return (
    <>
      <p>
        <i>Use links to connect concepts that don't fit in a hierarchy.</i>
      </p>
      <p>
        To insert a link, first edit an item by clicking on it. Then press{" "}
        <FakeButton icon="insertLink" label="Link" />, and select the item that you want to link to.
      </p>
      <p>
        <G.EmbeddedGoal id="insert-link" state={props.goalState} />
      </p>
      <p>
        After you've inserted a link, you can expand the link by clicking on it. This shows you the linked item
        directly in the outline.
      </p>
      <p>
        <G.EmbeddedGoal id="expand-link" state={props.goalState} />
      </p>
      <p>
        <i>
          Tip: You can also middle click on a link to jump there. Use the back button in your browser to go back.
        </i>
      </p>
      <p>
        Whenever you insert a link, Thinktool will automatically add a reference in the opposite direction.
        References are shown with a blue dash next to them.
      </p>
    </>
  );
}

export function StepStayingFocused(props: {goalState: G.State}) {
  return (
    <>
      <p>
        <i>
          Thinktool shows you everything you need right in the outline. But you can still jump to specific items
          when you need to focus on just the thing you're working on.
        </i>
      </p>
      <p>
        To narrow your view, click on an item and then press <FakeButton icon="jump" label="Jump" />. This will
        show you just that item and all its parents, children and references.
      </p>
      <p>
        <p>
          <G.EmbeddedGoal id="jump-item" state={props.goalState} />
        </p>
      </p>
      <p>You can use the back button in your browser to go back.</p>
      <p>
        <i>
          Tip: If you have a mouse with three buttons, you can also just middle click on the bullet next to an item
          to jump there directly.
        </i>
      </p>
      <p>
        If you get lost, you can always go back to the default item with
        <FakeButton icon="home" label="Home" />.
      </p>
      <p>
        <G.EmbeddedGoal id="jump-home" state={props.goalState} />
      </p>
      <p>
        <i>Tip: Try to organize your items so you can find them again from the home view.</i>
      </p>
      <p>
        You can also find a specific item with the <FakeButton icon="find" label="Find" /> button. Just search for
        an item by its content and select it to jump there.
      </p>
      <p>
        <G.EmbeddedGoal id="find-item" state={props.goalState} />
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
        If you ever want to do the tutorial again, just press the <FakeButton icon="tutorial" label="Tutorial" />{" "}
        button.
      </p>
      <p>
        If you have any questions, feedback or other comments, post them to{" "}
        <ExternalLink href="https://old.reddit.com/r/thinktool/">the subreddit</ExternalLink>, which you can always
        get to by pressing <FakeButton icon="forum" label="Forum" />.
      </p>
      <p>
        If you prefer, you are also welcome to email me directly at{" "}
        <ExternalLink href="mailto:jonas@thinktool.io">jonas@thinktool.io</ExternalLink>.
      </p>
      <p>
        <i>Thanks for trying out Thinktool!</i>
      </p>
    </>
  );
}
