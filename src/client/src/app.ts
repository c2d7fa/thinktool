import * as D from "./data";
import * as T from "./tree";
import {Communication} from "@thinktool/shared";

import * as Tutorial from "./tutorial";
import {GoalId} from "./goal";

export interface App {
  state: D.State;
  tutorialState: Tutorial.State;
  changelogShown: boolean;
  changelog: Communication.Changelog | "loading";
  tree: T.Tree;
}

export function from(data: D.State, tree: T.Tree): App {
  return {
    state: data,
    tree: tree,
    tutorialState: Tutorial.initialize(false),
    changelogShown: false,
    changelog: "loading",
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
  return merge(app, {tree: T.fromRoot(app.state, thing), tutorialState});
}

export function isGoalFinished(app: App, goal: GoalId): boolean {
  return Tutorial.isGoalFinished(app.tutorialState, goal);
}
