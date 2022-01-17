import * as D from "../data";
import * as T from "../tree";
import * as E from "../editor";
import * as P from "../popup";
import * as R from "./drag";
import * as O from "../orphans";
import * as Sy from "../sync";

import * as Ou from "./outline";
import * as I from "./item";

import {Communication} from "@thinktool/shared";

import * as Tutorial from "../tutorial";
import {GoalId} from "../goal";

import * as PlaceholderItem from "../ui/PlaceholderItem";
import * as Ac from "../actions";

const _isOnline = Symbol("isOnline");
const _syncDialog = Symbol("syncDialog");

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
  [_syncDialog]: Sy.Dialog.SyncDialog | null;
}

export type UpdateApp = (f: (app: App) => App) => void;

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
    [_syncDialog]: null,
  };
}

export {itemFromNode} from "./item";

export type ItemGraph = {[id: string]: {content?: D.Content; children?: string[]}};
export function of(items: ItemGraph): App {
  let state = D.empty;
  for (const id in items) {
    state = D.create(state, id)[0];
    state = D.setContent(state, id, items[id].content ?? ["Item " + id]);
  }
  for (const id in items) {
    for (const child of items[id].children ?? []) {
      state = D.addChild(state, id, child)[0];
    }
  }
  return from(state, T.fromRoot(state, "0"));
}

export function editor(app: App, node: T.NodeRef): E.Editor | null {
  if (!T.exists(app.tree, node)) return null;
  if (node.id in app.editors) return app.editors[node.id];
  return E.load(app, node);
}

export function edit(app: App, node: T.NodeRef, editor: E.Editor): App {
  return merge(E.save(app, editor, T.thing(app.tree, node)), {editors: {[node.id]: editor}});
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
  return merge(app, {tree: T.fromRoot(app.state, thing), tutorialState, editors: {}});
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
    return merge(app, {tab, tree: T.fromRoot(app.state, "0")});
  }

  throw "unknown tab!";
}

export function openPopup(
  app: App,
  useSelection: (app: App, thing: string) => App,
  args?: {icon: "search" | "insert" | "link"},
): {app: App; search: {query: string; items: {thing: string; content: string}[]}} {
  const items = D.allThings(app.state).map((thing) => ({thing, content: D.contentText(app.state, thing)}));
  const query = selectedText(app);

  const app_ = merge(app, {
    popup: P.open(app.popup, {
      query,
      select: useSelection,
      icon: args?.icon ?? "search",
    }),
  });

  return {app: app_, search: {items, query}};
}

export function replace(app: App, node: T.NodeRef, thing: string): App {
  const [state, tree, newNode] = T.replace(app.state, app.tree, node, thing);
  let app_ = merge(app, {state, tree});
  return edit(app_, newNode, E.placeSelectionAtEnd(editor(app_, newNode)!));
}

export function serverDisconnected(app: App): App {
  return {...app, [_isOnline]: false};
}

export function serverReconnected(app: App, remoteState: Sy.StoredState): App {
  if (!isDisconnected(app)) return app;
  const syncDialog = Sy.Dialog.initialize({local: Sy.storedStateFromApp(app), remote: remoteState});
  return {...app, [_isOnline]: true, [_syncDialog]: syncDialog};
}

export function syncDialog(app: App): Sy.Dialog.SyncDialog | null {
  return app[_syncDialog];
}

export function syncDialogSelect(app: App, option: "commit" | "abort"): App {
  if (app[_syncDialog] === null) {
    console.error("Tried to select sync dialog option when no dialog was open!");
    return app;
  }

  return Sy.loadAppFromStoredState(Sy.Dialog.storedStateAfter(app[_syncDialog]!, option));
}

export function isDisconnected(app: App): boolean {
  return !app[_isOnline];
}

export type Item = I.Item;
export type ItemKind = I.Kind;
export type ItemStatus = I.Status;
export type ItemEvent = I.Event;

export type Outline = Ou.Outline;

export function outline(app: App): Outline {
  return Ou.fromApp(app);
}

export type Event =
  | {type: "focus"; id: number}
  | {type: "item"; event: ItemEvent}
  | ({type: "drag"} & (
      | {subtype: "drag"; id: number}
      | {subtype: "hover"; id: number | null}
      | {subtype: "drop"; modifier: "move" | "copy"}
    ))
  | {type: "action"; action: Ac.ActionName}
  | ({type: "edit"} & E.Event);

function handleItemEvent(
  app: App,
  event: ItemEvent,
): {app: App; effects?: {search?: {items: {thing: string; content: string}[]; query: string}; url?: string}} {
  const item = (event: {id: number}) => ({id: event.id, hasFocus: T.hasFocus(app.tree, {id: event.id})});

  if (event.type === "drag") {
    return {app: merge(app, {drag: R.drag(app.tree, item(event))})};
  } else if (event.type === "click-bullet") {
    return {app: (event.alt ? I.altClick : I.click)(app, item(event))};
  } else if (event.type === "click-parent") {
    return {app: jump(app, event.thing)};
  } else if (event.type === "click-placeholder") {
    return {app: PlaceholderItem.create(app)};
  } else if (event.type === "toggle-references") {
    return {app: merge(app, {tree: T.toggleBackreferences(app.state, app.tree, item(event))})};
  } else if (event.type === "edit") {
    return E.handle(app, item(event), event.event);
  } else if (event.type === "unfold") {
    return {app: unfold(app, item(event))};
  } else {
    const unreachable: never = event;
    return unreachable;
  }
}

export function effects(
  app: App,
  event: Event,
): {search?: {items: {thing: string; content: string}[]; query: string}; url?: string} {
  if (event.type === "item") {
    return handleItemEvent(app, event.event).effects ?? {};
  } else {
    return {};
  }
}

function unreachable(x: never): never {
  return x;
}

export function update(app: App, event: Event): App {
  if (event.type === "focus") {
    return merge(app, {tree: T.focus(app.tree, {id: event.id})});
  } else if (event.type === "item") {
    return handleItemEvent(app, event.event).app;
  } else if (event.type === "drag") {
    if (event.subtype === "drag") return merge(app, {drag: R.drag(app.tree, {id: event.id})});
    else if (event.subtype === "hover")
      return merge(app, {drag: R.hover(app.drag, event.id ? {id: event.id} : null)});
    else if (event.subtype === "drop") return R.drop(app, event.modifier);
    else return unreachable(event);
  } else if (event.type === "action") {
    return Ac.update(app, event.action).app;
  } else if (event.type === "edit") {
    const node = T.focused(app.tree);
    if (!node) return app;
    return handleItemEvent(app, {id: node.id, type: "edit", event: event}).app;
  } else {
    return unreachable(event);
  }
}

export function isDragging(app: App): boolean {
  return R.isActive(app.drag);
}

export function focus(app: App, id: number | null): App {
  if (id === null) return merge(app, {tree: T.unfocus(app.tree)});
  else return merge(app, {tree: T.focus(app.tree, {id})});
}

export function focusedId(app: App): number | null {
  return T.focused(app.tree)?.id ?? null;
}
