import * as A from "../app";
import * as D from "../data";
import * as E from "../editor";
import * as Ac from "../actions";
import * as Sh from "../shortcuts";
import {IconId} from "../ui/icons";

const _isOpen = Symbol("active");
const _query = Symbol("query");
const _results = Symbol("results");
const _activeIndex = Symbol("activeIndex");
const _actionPhrase = Symbol("actionPhrase");

export type View =
  | {
      icon: IconId;
      open: false;
      description: string;
      shortcut: string;
      action: "find" | "replace" | "insert-link";
    }
  | {
      icon: IconId;
      description: string;
      shortcut: string;
      action: "find" | "replace" | "insert-link";
      open: true;
      query: string;
      isQuerySelected: boolean;
      results: {
        thing: string;
        content: A.Item["editor"]["content"];
        otherParents: A.Item["otherParents"];
        status: A.Item["status"];
        isSelected: boolean;
      }[];
    };

type Result = {
  thing: string;
  content: E.EditorContent;
  hasChildren: boolean;
  parents: {id: string; text: string}[];
};

export type Event =
  | {type: "up"}
  | {type: "down"}
  | {type: "select"}
  | {type: "close"}
  | {type: "query"; query: string}
  | {type: "pick"; thing: string};

export type State =
  | {[_isOpen]: false}
  | {
      [_isOpen]: true;
      [_query]: string;
      [_results]: Result[];
      [_activeIndex]: number | null;
      [_actionPhrase]: Ac.InitialActionPhrase;
    };

export const initial: State = {[_isOpen]: false};

export function open(state: State, args: {query: string} & Ac.InitialActionPhrase): State {
  return {
    ...state,
    [_isOpen]: true,
    [_query]: args.query,
    [_results]: [],
    [_activeIndex]: 0,
    [_actionPhrase]: {...args},
  };
}

function close(state: State): State {
  return {[_isOpen]: false};
}

export function isOpen(state: State): state is State & {[_isOpen]: true} {
  return state[_isOpen];
}

function setQuery(state: State, query: string): State {
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

function results(state: State): Result[] {
  if (!isOpen(state)) {
    console.warn("Tried to get results, but popup isn't open.");
    return [];
  }
  return state[_results];
}

function isThingActive(state: State, thing: string | null): boolean {
  if (!isOpen(state)) {
    console.warn("Tried to get selection, but poup isn't open.");
    return false;
  }
  if (state[_activeIndex] === null) return thing === null;
  return state[_results][state[_activeIndex]!]?.thing === thing;
}

function activatePrevious(state: State): State {
  if (!isOpen(state)) {
    console.warn("Tried to modify selection, but popup isn't open.");
    return state;
  }
  if (state[_activeIndex] === null) return state;
  else if (state[_activeIndex] === 0) return {...state, [_activeIndex]: null};
  else return {...state, [_activeIndex]: state[_activeIndex]! - 1};
}

function activateNext(state: State): State {
  if (!isOpen(state)) {
    console.warn("Tried to modify selection, but popup isn't open.");
    return state;
  }
  if (state[_activeIndex] === null) return {...state, [_activeIndex]: 0};
  else if (state[_activeIndex]! >= state[_results].length - 1) return state;
  else return {...state, [_activeIndex]: state[_activeIndex]! + 1};
}

function selectActive(app: A.App): A.App {
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

function selectThing(app: A.App, thing: string | null): A.App {
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
    result = Ac.evaluatePhrase(result, {...result.popup[_actionPhrase], object: newItem});
  } else {
    result = Ac.evaluatePhrase(result, {...result.popup[_actionPhrase], object: thing});
  }

  result = A.merge(result, {popup: close(result.popup)});

  return result;
}

function icon(app: A.App): IconId {
  if (isOpen(app.popup)) {
    const verb = app.popup[_actionPhrase].verb;
    return (
      {
        insertLink: "insertLink",
        insertChild: "insertChild",
        insertParent: "insertParent",
        insertSibling: "insertSibling",
        find: "find",
        replace: "insertSibling",
      } as const
    )[verb];
  }

  const editor = A.focusedEditor(app);
  if (editor === null) return "find";
  else if (E.isEmpty(editor)) return "insertSibling";
  else return "insertLink";
}

function update(state: State, event: Event & {type: "up" | "down" | "close"}): State {
  if (event.type === "up") {
    return activatePrevious(state);
  } else if (event.type === "down") {
    return activateNext(state);
  } else if (event.type === "close") {
    return close(state);
  } else {
    const unreachable: never = event;
    return unreachable;
  }
}

export function handle(app: A.App, event: Event): {app: A.App; effects: A.Effects} {
  if (event.type === "up" || event.type === "down" || event.type === "close") {
    return {app: A.merge(app, {popup: update(app.popup, event)}), effects: {}};
  } else if (event.type === "query") {
    return {app: A.merge(app, {popup: setQuery(app.popup, event.query)}), effects: {search: {query: event.query}}};
  } else if (event.type === "pick") {
    return {app: selectThing(app, event.thing), effects: {}};
  } else if (event.type === "select") {
    return {app: selectActive(app), effects: {}};
  } else {
    const unreachable: never = event;
    return unreachable;
  }
}

export function view(app: A.App): View {
  const popup = app.popup;

  const icon_ = icon(app);
  const action = icon_ === "find" ? "find" : icon_ === "insertSibling" ? "replace" : "insert-link";
  const description =
    icon_ === "find"
      ? "search"
      : icon_ === "insertSibling"
      ? "connect an existing item"
      : icon_ === "insertLink"
      ? "insert a link"
      : "";

  if (!isOpen(popup))
    return {open: false, icon: icon_, description, shortcut: Sh.format(Ac.shortcut(action)), action};

  return {
    open: true,
    icon: icon(app),
    query: popup[_query],
    action,
    description,
    shortcut: Sh.format(Ac.shortcut(action)),
    isQuerySelected: isThingActive(popup, null),
    results: results(popup).map((result) => {
      return {
        content: result.content,
        isSelected: isThingActive(popup, result.thing),
        otherParents: result.parents,
        status: result.hasChildren ? "collapsed" : "terminal",
        thing: result.thing,
      };
    }),
  };
}
