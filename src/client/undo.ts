import {State} from "./data";

const stack: State[] = [];

function pushState(state: State): void {
  stack.push(state);
}

function popState(): State | null {
  if (stack.length === 0)
    return null;
  return stack?.pop() ?? null;
}

export const undo = {pushState, popState};

export default undo;
