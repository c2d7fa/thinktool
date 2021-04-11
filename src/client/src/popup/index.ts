import * as A from "../app";
import * as D from "../data";
import * as E from "../editing";

const _isOpen = Symbol("active");
const _query = Symbol("query");
const _results = Symbol("results");
const _activeIndex = Symbol("activeIndex");
const _select = Symbol("activeIndex");

export type Result = {
  thing: string;
  content: E.EditorContent;
  hasChildren: boolean;
  parents: {id: string; text: string}[];
};

export type State =
  | {[_isOpen]: false}
  | {
      [_isOpen]: true;
      [_query]: string;
      [_results]: Result[];
      [_activeIndex]: number | null;
      [_select]: (app: A.App, thing: string) => A.App;
    };

export const initial: State = {[_isOpen]: false};

export function open(state: State, args: {query: string; select(app: A.App, thing: string): A.App}): State {
  return {
    ...state,
    [_isOpen]: true,
    [_query]: args.query,
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

export function setQuery(state: State, query: string): State {
  if (!isOpen(state)) {
    console.warn("Tried to set query, but popup isn't open.");
    return state;
  }
  return {...state, [_query]: query};
}

export function receiveResults(state: State, data: D.State, things: string[]): State {
  if (!isOpen(state)) {
    console.warn("Tried to set results, but popup isn't open.");
    return state;
  }
  return {
    ...state,
    [_results]: things.map((thing) => ({
      thing,
      content: E.loadContent(data, thing),
      hasChildren: D.hasChildrenOrReferences(data, thing),
      parents: D.parents(data, thing).map((parent) => ({id: parent, text: D.contentText(data, parent)})),
    })),
  };
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

export function selectActive(app: A.App): A.App {
  if (!isOpen(app.popup)) {
    console.warn("Tried to select item, but popup isn't open.");
    return app;
  }

  if (app.popup[_activeIndex] === null) {
    return selectThing(app, null);
  } else {
    const thing = app.popup[_results][app.popup[_activeIndex]!].thing;
    if (thing !== undefined) {
      return selectThing(app, thing);
    } else {
      return app;
    }
  }
}

export function selectThing(app: A.App, thing: string | null): A.App {
  let result = app;

  if (!isOpen(result.popup)) {
    console.warn("Tried to select item, but popup isn't open.");
    return result;
  }

  if (thing === null) {
    // Create new thing with query as content
    let [state, newItem] = D.create(result.state);
    state = D.setContent(state, newItem, [result.popup[_query]]);
    result = A.merge(result, {state});

    if (!isOpen(result.popup)) throw "logic error";
    result = result.popup[_select](result, newItem);
  } else {
    result = result.popup[_select](result, thing);
  }

  result = A.merge(result, {popup: close(result.popup)});

  return result;
}
