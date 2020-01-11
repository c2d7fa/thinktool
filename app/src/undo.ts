import {Things} from "./data";

const stack = [];

function pushState(state: Things): void {
  stack.push(state);
}

function popState(): Things | null {
  if (stack.length === 0)
    return null;
  return stack.pop();
}

export const undo = {pushState, popState};

export default undo;
