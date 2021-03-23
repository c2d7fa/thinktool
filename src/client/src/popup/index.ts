import Search, {Result} from "../search";

const _isOpen = Symbol("active");
const _query = Symbol("query");
const _search = Symbol("search");
const _results = Symbol("results");

export type State =
  | {[_isOpen]: false}
  | {
      [_isOpen]: true;
      [_query]: string;
      [_search]: Search;
      [_results]: Result[];
    };

export type Selection = {thing: string} | {content: string};

export const initial: State = {[_isOpen]: false};

export function open(
  state: State,
  args: {query: string; search: Search; select(selection: Selection): void},
): State {
  return {...state, [_isOpen]: true, [_query]: args.query, [_search]: args.search, [_results]: []};
}

export function close(state: State): State {
  return {...state, [_isOpen]: false};
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
