import * as D from "./data";
import * as T from "./tree";
import * as E from "./editing";
import {Communication} from "@thinktool/shared";

import * as Tutorial from "./tutorial";
import {GoalId} from "./goal";

export interface App {
  state: D.State;
  tutorialState: Tutorial.State;
  changelogShown: boolean;
  changelog: Communication.Changelog | "loading";
  tree: T.Tree;
  editors: {[nodeId: number]: E.Editor};
}

export function from(data: D.State, tree: T.Tree): App {
  return {
    state: data,
    tree: tree,
    tutorialState: Tutorial.initialize(false),
    changelogShown: false,
    changelog: "loading",
    editors: {},
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
  if (!(node.id in app.tree.nodes)) return null;
  if (node.id in app.editors) return app.editors[node.id];
  return E.load(app, node);
}

export function edit(app: App, node: T.NodeRef, editor: E.Editor): App {
  return merge(E.save(app, editor, T.thing(app.tree, node)), {editors: {[node.id]: editor}});
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
