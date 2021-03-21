const _isOpen = Symbol("active");

export type State = {[_isOpen]: boolean};

export const initial: State = {[_isOpen]: false};

export function open(state: State): State {
  return {...state, [_isOpen]: true};
}

export function close(state: State): State {
  return {...state, [_isOpen]: false};
}

export function isOpen(state: State): boolean {
  return state[_isOpen];
}
