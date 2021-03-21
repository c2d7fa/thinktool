const _isOpen = Symbol("active");
const _query = Symbol("active");

export type State = {[_isOpen]: false} | {[_isOpen]: true; [_query]: string};

export const initial: State = {[_isOpen]: false};

export function open(state: State, args: {query: string}): State {
  return {...state, [_isOpen]: true, [_query]: args.query};
}

export function close(state: State): State {
  return {...state, [_isOpen]: false};
}

export function isOpen(state: State): state is State & {[_isOpen]: true} {
  return state[_isOpen];
}

export function replaceQuery(state: State, query: string): State {
  if (!isOpen(state)) {
    console.warn("Tried to set query, but popup isn't open.");
    return state;
  }
  return {...state, [_query]: query};
}

export function query(state: State): string {
  if (!isOpen(state)) {
    console.warn("Tried to get query, but popup isn't open.");
    return "";
  }
  return state[_query];
}
