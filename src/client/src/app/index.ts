import * as D from "../data";
import * as T from "../tree";
import * as E from "../editor";
import * as P from "../popup";
import * as R from "./drag";
import * as O from "../orphans";
import * as Sy from "../sync";

import * as Toolbar from "./toolbar";
import * as Ou from "./outline";
import * as I from "./item";

import {Communication} from "@thinktool/shared";

import * as Tutorial from "../tutorial";
import {GoalId} from "../goal";

import * as PlaceholderItem from "../ui/PlaceholderItem";
import * as Ac from "../actions";
import {FullStateResponse} from "@thinktool/shared/dist/communication";

const _isOnline = Symbol("isOnline");
const _pendingChanges = Symbol("pendingChanges");
const _toolbarShown = Symbol("toolbarShown");
const _lastSyncedState = Symbol("lastSyncedState");

export type StoredState = Sy.StoredState;

export interface App {
  state: D.State;
  tutorialState: Tutorial.State;
  changelogShown: boolean;
  changelog: Communication.Changelog | "loading";
  tree: T.Tree;
  editors: {[nodeId: number]: E.Editor};
  popup: P.State;
  drag: R.Drag;
  tab: "outline" | "orphans";
  orphans: O.OrphansState;
  [_isOnline]: boolean;
  [_pendingChanges]: Sy.Changes;
  [_toolbarShown]: boolean;
  [_lastSyncedState]: StoredState;
}

export type UpdateApp = (f: (app: App) => App) => void;
export type Send = (ev: Event) => void;

export function from(data: D.State, tree: T.Tree, options?: {tutorialFinished: boolean}): App {
  return {
    state: data,
    tree: tree,
    tutorialState: Tutorial.initialize(options?.tutorialFinished ?? false),
    changelogShown: false,
    changelog: "loading",
    editors: {},
    popup: P.initial,
    drag: R.empty,
    tab: "outline",
    orphans: O.empty,
    [_isOnline]: true,
    [_pendingChanges]: Sy.emptyChanges,
    [_toolbarShown]: true,
    [_lastSyncedState]: {
      fullStateResponse: D.transformStateIntoFullStateResponse(data),
      tutorialFinished: options?.tutorialFinished ?? false,
    },
  };
}

export {itemFromNode} from "./item";

export type ItemGraph = {[id: string]: {content?: D.Content; children?: string[]}};

function itemGraphToFullStateResponse(itemGraph: ItemGraph): FullStateResponse {
  let i = 0;

  return {
    things: Object.keys(itemGraph).map((id) => ({
      name: id,
      content: itemGraph[id].content ?? ["Item " + id],
      children: (itemGraph[id].children ?? []).map((child) => ({name: `${id}.${i++}`, child: child})),
    })),
  };
}

export function of(items: ItemGraph): App {
  return initialize({
    fullStateResponse: itemGraphToFullStateResponse(items),
    urlHash: null,
    tutorialFinished: false,
    toolbarShown: true,
  });
}

export type InitialState = {
  urlHash: string | null;
  fullStateResponse: FullStateResponse;
  tutorialFinished: boolean;
  toolbarShown: boolean;
};

export function initialize(data: InitialState): App {
  function parseThingFromUrlHash(hash: string): string {
    const thingName = hash.slice(1);
    if (data.fullStateResponse.things.find((thing) => thing.name === thingName)) {
      return thingName;
    } else {
      return "0";
    }
  }

  const state = D.transformFullStateResponseIntoState(data.fullStateResponse);
  let result = from(state, T.fromRoot(state, "0"), {tutorialFinished: data.tutorialFinished});
  result = jump(result, parseThingFromUrlHash(data.urlHash ?? "#0"));
  if (!data.toolbarShown) result = update(result, {type: "toggleToolbar"});
  return result;
}

export function editor(app: App, node: T.NodeRef): E.Editor | null {
  if (!T.exists(app.tree, node)) return null;
  if (node.id in app.editors) return app.editors[node.id];
  return E.load(app, node);
}

export function edit(app: App, node: T.NodeRef, newEditor: Partial<E.Editor>): App {
  const fullNewEditor = {...editor(app, node)!, ...newEditor};
  return merge(E.save(app, fullNewEditor, T.thing(app.tree, node)), {editors: {[node.id]: fullNewEditor}});
}

export function editInsertLink(app: App, node: T.NodeRef, link: string): App {
  if (editor(app, node) === null) return app;
  return edit(app, node, E.insertLink(editor(app, node)!, {link, title: D.contentText(app.state, link)}));
}

export function focusedEditor(app: App): E.Editor | null {
  const focusedNode = T.focused(app.tree);
  if (focusedNode === null) return null;
  return editor(app, focusedNode);
}

export function selectedText(app: App): string {
  const editor = focusedEditor(app);
  return editor ? E.selectedText(editor) : "";
}

export function merge(app: App, values: {[K in keyof App]?: App[K]}): App {
  const result = {...app};
  for (const k in values) {
    // I'm sure there's a smarter way to do this, but it doesn't really
    // matter. Our function signature is fine.
    (result[k as keyof App] as any) = values[k as keyof App]!;
  }
  return result;
}

export function jump(app: App, thing: string): App {
  const tutorialState = Tutorial.action(app.tutorialState, {
    action: "jump",
    previouslyFocused: T.thing(app.tree, T.root(app.tree)),
    thing,
  });
  return merge(app, {tree: T.fromRoot(app.state, thing), tutorialState, editors: {}, tab: "outline"});
}

export function toggleLink(app: App, node: T.NodeRef, link: string): App {
  const tutorialState = Tutorial.action(app.tutorialState, {
    action: "link-toggled",
    expanded: !T.isLinkOpen(app.tree, node, link),
  });
  const tree = T.toggleLink(app.state, app.tree, node, link);
  return merge(app, {tutorialState, tree});
}

export function isGoalFinished(app: App, goal: GoalId): boolean {
  return Tutorial.isGoalFinished(app.tutorialState, goal);
}

export function createChild(app: App, node: T.NodeRef): App {
  const [state, tree] = T.createChild(app.state, app.tree, node);
  return merge(app, {state, tree});
}

export function unfold(app: App, node: T.NodeRef): App {
  function unfold_(app: App, node: T.NodeRef, seen: string[]): App {
    if (!D.hasChildren(app.state, T.thing(app.tree, node))) {
      return app;
    } else {
      let result = merge(app, {tree: T.expand(app.state, app.tree, node)});
      for (let i = 0; i < T.children(result.tree, node).length; ++i) {
        const child = T.children(result.tree, node)[i];
        if (seen.includes(T.thing(result.tree, child))) continue;
        result = unfold_(result, child, [...seen, T.thing(result.tree, child)]);
      }
      return result;
    }
  }

  return unfold_(app, node, [T.thing(app.tree, node)]);
}

export function switchTab(app: App, tab: "outline" | "orphans"): App {
  if (tab === "orphans") {
    return O.scan(merge(app, {tab}));
  } else if (tab === "outline") {
    return merge(app, {tab, tree: T.fromRoot(app.state, "0"), editors: {}});
  }

  throw "unknown tab!";
}

export function openPopup(app: App, phrase: Ac.InitialActionPhrase): {app: App; effects: Effects} {
  const items = D.allThings(app.state).map((thing) => ({thing, content: D.contentText(app.state, thing)}));
  const query = selectedText(app);

  const app_ = merge(app, {
    popup: P.open(app.popup, {query, ...phrase}),
  });

  return {app: app_, effects: {search: {items, query}}};
}

export function replace(app: App, node: T.NodeRef, thing: string): App {
  const [state, tree, newNode] = T.replace(app.state, app.tree, node, thing);
  let app_ = merge(app, {state, tree});
  return edit(app_, newNode, E.placeSelectionAtEnd(editor(app_, newNode)!));
}

function serverDisconnected(app: App): App {
  return {...app, [_isOnline]: false};
}

function serverReconnected(app: App, remoteState: StoredState): App {
  if (!isDisconnected(app)) return app;
  return {...app, [_isOnline]: true, [_pendingChanges]: Sy.changes(Sy.storedStateFromApp(app), remoteState)};
}

function syncDialogSelect(app: App, option: "commit" | "abort"): App {
  if (!app[_pendingChanges]) {
    console.error("Tried to select sync dialog option when no dialog was open!");
    return app;
  }

  if (option === "commit") {
    return app;
  } else {
    return Sy.loadAppFromStoredState(Sy.applyChanges(Sy.storedStateFromApp(app), app[_pendingChanges]));
  }
}

function isDisconnected(app: App): boolean {
  return !app[_isOnline];
}

export type Item = I.Item;
export type ItemKind = I.Kind;
export type ItemStatus = I.Status;
export type ItemEvent = I.Event;

export type Outline = Ou.Outline;

export type Event =
  | {type: "focus"; id: number}
  | {type: "unfocus"}
  | ItemEvent
  | {type: "dragHover"; id: number | null}
  | {type: "dragEnd"; modifier: "move" | "copy"}
  | {type: "action"; action: Ac.ActionName}
  | {type: "orphans"; event: O.OrphansEvent}
  | ({topic: "popup"} & P.Event)
  | {type: "toggleToolbar"}
  | {type: "searchResponse"; things: string[]}
  | {type: "urlChanged"; hash: string}
  | {type: "syncDialogSelect"; option: "commit" | "abort"}
  | {type: "flushChanges"}
  | {type: "serverDisconnected"}
  | {type: "followExternalLink"; href: string}
  | {type: "receivedChanges"; changes: {thing: string; data: Communication.ThingData | null}[]}
  | (
      | {type: "serverPingResponse"; result: "failed"}
      | {type: "serverPingResponse"; result: "success"; remoteState: StoredState}
    )
  | Tutorial.Event;

export type Effects = {
  search?: {items?: {thing: string; content: string}[]; query: string};
  url?: string;
  tryReconnect?: boolean;
  changes?: Sy.Changes;
};

function unreachable(x: never): never {
  return x;
}

function isPopupEvent(e: Event): e is {topic: "popup"} & P.Event {
  return "topic" in e && e.topic === "popup";
}

export function handle(app: App, event: Event): {app: App; effects?: Effects} {
  function updateFocus(app: App, id: number, focused: boolean): App {
    const hasFocus = T.hasFocus(app.tree, {id});
    return focused ? focus(app, id) : hasFocus ? focus(app, null) : app;
  }

  if (event.type === "edit") {
    return {app: updateFocus(edit(app, {id: event.id}, event.editor), event.id, event.focused ?? true)};
  } else if (event.type === "open") {
    return {app: toggleLink(app, {id: event.id}, event.link)};
  } else if (event.type === "jump") {
    return {app: jump(app, event.link)};
  } else if (event.type === "paste") {
    return {app: E.pasteParagraphs(app, {id: event.id}, event.paragraphs)};
  } else if (event.type === "action") {
    const result = Ac.handle(app, event.action);
    if (O.orphansMayBeStale(app, result.app)) return {...result, app: O.scan(result.app)};
    else return result;
  } else if (event.type === "openUrl") {
    return {app: app, effects: {url: event.url}};
  } else if (event.type === "startDrag") {
    return {app: merge(app, {drag: R.drag(app.tree, {id: event.id})})};
  } else if (event.type === "click-bullet") {
    return {app: (event.alt ? I.altClick : I.click)(app, {id: event.id})};
  } else if (event.type === "click-parent") {
    return {app: jump(app, event.thing)};
  } else if (event.type === "click-placeholder") {
    return {app: PlaceholderItem.create(app)};
  } else if (event.type === "toggle-references") {
    return {app: merge(app, {tree: T.toggleBackreferences(app.state, app.tree, {id: event.id})})};
  } else if (event.type === "unfold") {
    return {app: unfold(app, {id: T.root(app.tree).id})};
  } else if (event.type === "focus") {
    return {app: merge(app, {tree: T.focus(app.tree, {id: event.id})}), effects: {}};
  } else if (event.type === "dragHover") {
    return {app: merge(app, {drag: R.hover(app.drag, event.id ? {id: event.id} : null)})};
  } else if (event.type === "dragEnd") {
    return {app: R.drop(app, event.modifier)};
  } else if (event.type === "orphans") {
    return O.handle(app, event.event);
  } else if (event.type === "toggleToolbar") {
    return {app: {...app, [_toolbarShown]: !app[_toolbarShown]}};
  } else if (event.type === "searchResponse") {
    return {app: merge(app, {popup: P.receiveResults(app.popup, app.state, event.things)})};
  } else if (event.type === "unfocus") {
    return {app: merge(app, {tree: T.unfocus(app.tree)})};
  } else if (event.type === "urlChanged") {
    const thing = event.hash.slice(1);
    return {app: jump(app, thing === "" ? "0" : thing)};
  } else if (event.type === "syncDialogSelect") {
    return {app: syncDialogSelect(app, event.option)};
  } else if (isPopupEvent(event)) {
    return P.handle(app, event);
  } else if (event.type === "serverDisconnected") {
    return {app: serverDisconnected(app), effects: isDisconnected(app) ? {} : {tryReconnect: true}};
  } else if (event.type === "receivedChanges") {
    const app1 = {...Sy.receiveChangedThingsFromServer(app, event.changes)};
    const app2 = {...app1, [_lastSyncedState]: Sy.storedStateFromApp(app1)};
    return {app: app2};
  } else if (event.type === "serverPingResponse") {
    return {
      app: event.result === "failed" ? app : serverReconnected(app, event.remoteState),
      effects: {tryReconnect: event.result === "failed"},
    };
  } else if (event.type === "flushChanges") {
    const changes = Sy.changes(app[_lastSyncedState], Sy.storedStateFromApp(app));
    const changesNonEmpty =
      changes.deleted.length > 0 ||
      changes.updated.length > 0 ||
      changes.edited.length > 0 ||
      changes.tutorialFinished !== null;
    return {
      app: {...app, [_lastSyncedState]: Sy.storedStateFromApp(app)},
      effects: changesNonEmpty ? {changes} : {},
    };
  } else if (event.type === "followExternalLink") {
    return {app, effects: {url: event.href}};
  } else if (event.topic === "tutorial") {
    return {app: merge(app, {tutorialState: Tutorial.update(app.tutorialState, event)})};
  } else {
    return unreachable(event);
  }
}

export function update(app: App, event: Event): App {
  return handle(app, event).app;
}

export function after(app: App | ItemGraph, events: (Event | ((view: View) => Event))[]): App {
  function executeSearch(result: {app: App; effects?: Effects}): App {
    if (!result?.effects?.search) return result.app;
    return update(result.app, {
      type: "searchResponse",
      things: D.allThings(result.app.state)
        .map((thing) => ({thing, content: D.contentText(result.app.state, thing)}))
        .filter((item) => item.content.startsWith(result.effects!.search!.query))
        .map((r) => r.thing),
    });
  }

  return events.reduce(
    (app_, event) => {
      return executeSearch(typeof event === "function" ? handle(app_, event(view(app_))) : handle(app_, event));
    },
    _isOnline in app ? (app as App) : of(app as ItemGraph),
  );
}

export function isDragging(app: App): boolean {
  return R.isActive(app.drag);
}

function focus(app: App, id: number | null): App {
  if (id === null) return merge(app, {tree: T.unfocus(app.tree)});
  else return merge(app, {tree: T.focus(app.tree, {id})});
}

export function focusedId(app: App): number | null {
  return T.focused(app.tree)?.id ?? null;
}

export type View = (({tab: "outline"} & Outline) | ({tab: "orphans"} & O.OrphansView)) & {
  toolbar: Toolbar.View;
  popup: P.View;
  tutorial: Tutorial.View;
  url: {root: string};
  offlineIndicator: {shown: boolean};
  syncDialog: Sy.Dialog.View;
};

export function view(app: App): View {
  return {
    popup: P.view(app),
    tutorial: Tutorial.view(app.tutorialState),
    toolbar: app[_toolbarShown] ? Toolbar.viewToolbar(app) : {shown: false},
    url: {root: T.thing(app.tree, T.root(app.tree))},
    offlineIndicator: {shown: isDisconnected(app)},
    syncDialog: Sy.Dialog.view(app[_pendingChanges]),
    ...(app.tab === "orphans" ? {tab: "orphans", ...O.view(app)} : {tab: "outline", ...Ou.fromApp(app)}),
  };
}
