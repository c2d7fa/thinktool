import {Things} from "./client/data";

const stack: Things[] = [];

function pushState(state: Things): void {
  stack.push(state);
}

function popState(): Things | null {
  if (stack.length === 0)
    return null;
  return stack?.pop() ?? null;
}

export const undo = {pushState, popState};

export default undo;
