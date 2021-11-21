import * as D from "./data";
import * as T from "./tree";
import * as E from "./editing";
import * as P from "./popup";
import * as R from "./drag";
import * as O from "./orphans";
import * as Sy from "./sync";
import {Communication} from "@thinktool/shared";

import * as Tutorial from "./tutorial";
import {GoalId} from "./goal";

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
  orphans: O.Orphans;
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
    orphans: O.scan(O.fromState(data)),
    [_isOnline]: true,
    [_syncDialog]: null,
  };
}

export type ItemGraph = {[id: string]: {content: D.Content; children?: string[]}};
export function of(items: ItemGraph): App {
  let state = D.empty;
  for (const id in items) {
    state = D.create(state, id)[0];
    state = D.setContent(state, id, items[id].content);
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
    const orphans = O.scan(O.fromState(app.state));
    return merge(app, {tab, orphans});
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

export function serverReconnected(app: App): App {
  const syncDialog = Sy.Dialog.initialize(5, 2, 6);
  return {...app, [_isOnline]: true, [_syncDialog]: syncDialog};
}

export function syncDialog(app: App): Sy.Dialog.SyncDialog | null {
  return app[_syncDialog];
}

export function dismissSyncDialog(app: App): App {
  return {...app, [_syncDialog]: null};
}

export function isDisconnected(app: App): boolean {
  return !app[_isOnline];
}
