import {ActionName} from "./actions";

import * as G from "./goal";

export type State = {step: string; finished: boolean; goal: G.State};

export type View =
  | {open: false}
  | {
      open: true;
      step: string;
      goals: {[id in G.GoalId]: {completed: boolean}};
      title: string;
      currentStep: number;
      totalSteps: number;
      previousStepDisabled: boolean;
      nextStepLabel: string;
    };

export type Event = {topic: "tutorial"} & ({type: "next"} | {type: "previous"});

export function update(state: State, event: Event): State {
  if (event.type === "next") {
    if (!hasNextStep(state)) return {...state, finished: true};
    return nextStep(state);
  } else if (event.type === "previous") {
    return previousStep(state);
  } else {
    const unreachable: never = event;
    return unreachable;
  }
}

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

export function view(state: State): View {
  if (state.finished) return {open: false};
  return {
    open: true,
    step: state.step,
    goals: Object.fromEntries(
      G.allGoalIds.map((goalId) => [goalId, {completed: G.isFinished(state.goal, goalId) ? true : false}]),
    ) as {[goalId in G.GoalId]: {completed: boolean}},
    title: state.step,
    currentStep: stepIndex(state) + 1,
    totalSteps: amountSteps(state),
    previousStepDisabled: !hasPreviousStep(state),
    nextStepLabel: hasNextStep(state) ? "Next Step >" : "Close >",
  };
}
