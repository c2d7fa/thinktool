import * as A from "./app";
import * as D from "./data";
import * as E from "./editor";
import * as Ac from "./actions";
import * as Sh from "./shortcuts";
import {IconId} from "./ui/icons";

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

export function isOpen(state: State): state is State & {[_isOpen]: true} {
  return state[_isOpen];
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

function selection(popup: State & {[_isOpen]: true}): {query: string} | {thing: string} {
  if (!isOpen(popup)) return {query: ""};
  return popup[_activeIndex] === null
    ? {query: popup[_query]}
    : {thing: popup[_results][popup[_activeIndex]!].thing};
}

function execute(app: A.App, selection: {query: string} | {thing: string}, phrase: Ac.InitialActionPhrase): A.App {
  function createThing(app: A.App, content: E.EditorContent): [A.App, string] {
    let [state, newItem] = D.create(app.state);
    state = D.setContent(state, newItem, content);
    return [A.merge(app, {state}), newItem];
  }

  const [app_, object] = "query" in selection ? createThing(app, [selection.query]) : [app, selection.thing];
  return Ac.evaluatePhrase(app_, {...phrase, object});
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

export function handle(app: A.App, event: Event): {app: A.App; effects: A.Effects} {
  function updatePopup(state: State, event: Event): State {
    if (!isOpen(state)) return state;
    if (event.type === "up") {
      return activatePrevious(state);
    } else if (event.type === "down") {
      return activateNext(state);
    } else if (event.type === "query") {
      return {...state, [_query]: event.query};
    } else if (event.type === "close" || event.type === "pick" || event.type === "select") {
      return {[_isOpen]: false};
    } else {
      return state;
    }
  }

  function updateApp(app: A.App, event: Event): A.App {
    if (!isOpen(app.popup)) return app;
    if (event.type === "pick") return execute(app, {thing: event.thing}, app.popup[_actionPhrase]);
    if (event.type === "select") return execute(app, selection(app.popup), app.popup[_actionPhrase]);
    else return app;
  }

  function effects(app: A.App, event: Event): A.Effects {
    if (event.type === "query") return {search: {query: event.query}};
    else return {};
  }

  return {
    app: A.merge(updateApp(app, event), {popup: updatePopup(app.popup, event)}),
    effects: effects(app, event),
  };
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
    isQuerySelected: popup[_activeIndex] === null,
    results: popup[_results].map((result, index) => ({
      content: result.content,
      isSelected: popup[_activeIndex] === index,
      otherParents: result.parents,
      status: result.hasChildren ? "collapsed" : "terminal",
      thing: result.thing,
    })),
  };
}
