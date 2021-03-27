import Search, {Result} from "../search";

const _isOpen = Symbol("active");
const _query = Symbol("query");
const _search = Symbol("search");
const _results = Symbol("results");
const _activeIndex = Symbol("activeIndex");
const _select = Symbol("activeIndex");

export type State =
  | {[_isOpen]: false}
  | {
      [_isOpen]: true;
      [_query]: string;
      [_search]: Search;
      [_results]: Result[];
      [_activeIndex]: number | null;
      [_select]: (selection: Selection) => void;
    };

export type Selection = {thing: string} | {content: string};

export const initial: State = {[_isOpen]: false};

export function open(
  state: State,
  args: {query: string; search: Search; select(selection: Selection): void},
): State {
  return {
    ...state,
    [_isOpen]: true,
    [_query]: args.query,
    [_search]: args.search,
    [_results]: [],
    [_activeIndex]: 0,
    [_select]: args.select,
  };
}

export function close(state: State): State {
  return {[_isOpen]: false};
}

export function isOpen(state: State): state is State & {[_isOpen]: true} {
  return state[_isOpen];
}

export function search(state: State, query: string): State {
  if (!isOpen(state)) {
    console.warn("Tried to set query, but popup isn't open.");
    return state;
  }
  const results = state[_search].query(query, 50);
  return {...state, [_query]: query, [_results]: results};
}

export function results(state: State): Result[] {
  if (!isOpen(state)) {
    console.warn("Tried to get results, but popup isn't open.");
    return [];
  }
  return state[_results];
}

export function query(state: State): string {
  if (!isOpen(state)) {
    console.warn("Tried to get query, but popup isn't open.");
    return "";
  }
  return state[_query];
}

export function isThingActive(state: State, thing: string | null): boolean {
  if (!isOpen(state)) {
    console.warn("Tried to get selection, but poup isn't open.");
    return false;
  }
  if (state[_activeIndex] === null) return thing === null;
  return state[_results][state[_activeIndex]!]?.thing === thing;
}

export function activatePrevious(state: State): State {
  if (!isOpen(state)) {
    console.warn("Tried to modify selection, but popup isn't open.");
    return state;
  }
  if (state[_activeIndex] === null) return state;
  else if (state[_activeIndex] === 0) return {...state, [_activeIndex]: null};
  else return {...state, [_activeIndex]: state[_activeIndex]! - 1};
}

export function activateNext(state: State): State {
  if (!isOpen(state)) {
    console.warn("Tried to modify selection, but popup isn't open.");
    return state;
  }
  if (state[_activeIndex] === null) return {...state, [_activeIndex]: 0};
  else if (state[_activeIndex]! >= state[_results].length - 1) return state;
  else return {...state, [_activeIndex]: state[_activeIndex]! + 1};
}

export function selectActive(state: State): State {
  if (!isOpen(state)) {
    console.warn("Tried to select item, but popup isn't open.");
    return close(state);
  }
  if (state[_activeIndex] === null) {
    return selectThing(state, null);
  } else {
    const thing = state[_results][state[_activeIndex]!].thing;
    if (thing !== undefined) {
      return selectThing(state, thing);
    } else {
      return state;
    }
  }
}

export function selectThing(state: State, thing: string | null): State {
  if (!isOpen(state)) {
    console.warn("Tried to select item, but popup isn't open.");
    return close(state);
  }
  if (thing === null) state[_select]({content: state[_query]});
  else state[_select]({thing});
  return close(state);
}
