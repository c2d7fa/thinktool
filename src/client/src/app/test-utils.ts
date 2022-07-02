import * as A from "./index";
import * as D from "../data";
import * as T from "../tree";
import * as W from "../wrapap";

export type ItemDescription = {
  id?: string;
  content?: string | (string | {link: string})[];
  children?: ItemDescription[];
};

export type Description = {};

export function construct(root: ItemDescription, looseItems?: ItemDescription[]): A.App {
  let state = D.empty;

  function add(item: ItemDescription): string {
    let id: string;
    [state, id] = D.create(state, item.id);
    if (item.content) {
      state = D.setContent(state, id, typeof item.content === "string" ? [item.content] : item.content);
    }
    for (const child of item.children ?? []) {
      const childId = add(child);
      state = D.addChild(state, id, childId)[0];
    }
    return id;
  }

  for (const item of looseItems ?? []) add(item);

  const rootId = add(root);

  return A.from(state, T.fromRoot(state, rootId));
}

function expectMatch(actual: any, expected: any): void {
  if (expected instanceof Array) {
    expect(actual).toBeInstanceOf(Array);
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expectMatch(actual[i], expected[i]);
    }
  } else if (typeof expected === "object") {
    expect(typeof actual).toBe("object");
    for (const key of Object.keys(expected)) {
      expectMatch(actual[key], expected[key]);
    }
  } else {
    expect(actual).toEqual(expected);
  }
}

export function expectViewToMatch(app: A.App | W.Wrapap, expected: any): void {
  const app_ = "app" in app ? app.app : app;
  const view = A.view(app_);
  return expectMatch(view, expected);
}

export const $reference = Symbol("reference");
type Path = (number | [typeof $reference, number])[];

export function expandPath(app: W.Wrapap, path: Path): W.Wrapap {
  function findItemAt(base: A.Item, path: (number | [typeof $reference, number])[]): A.Item | undefined {
    if (path.length === 0) {
      return base;
    } else if (typeof path[0] === "object") {
      return base.references.state === "expanded"
        ? findItemAt(base.references.items[path[0][1]], path.slice(1))
        : undefined;
    } else {
      return findItemAt(base.children[path[0]], path.slice(1));
    }
  }

  let expandedApp = app.app;
  let expandingNode = (A.view(expandedApp) as A.Outline).root;

  for (let i = 0; i < path.length; ++i) {
    const part = path[i];
    const pathPrefix = path.slice(0, i);

    if (typeof part === "object") {
      expandedApp = A.update(expandedApp, {type: "toggle-references", id: findItemAt(expandingNode, [part])!.id});
    } else {
      expandedApp = A.update(expandedApp, {
        type: "click-bullet",
        alt: false,
        id: findItemAt(expandingNode, [part])!.id,
      });
    }

    expandingNode = findItemAt((A.view(expandedApp) as A.Outline).root, [...pathPrefix, part])!;
  }

  return W.from(expandedApp);
}

function itemAt(app: A.App | W.Wrapap, path: (number | [typeof $reference, number])[]): A.Item {
  function findItemAt(base: A.Item, path: (number | [typeof $reference, number])[]): A.Item | undefined {
    if (path.length === 0) {
      return base;
    } else if (typeof path[0] === "object") {
      return base.references.state === "expanded"
        ? findItemAt(base.references.items[path[0][1]], path.slice(1))
        : undefined;
    } else {
      return findItemAt(base.children[path[0]], path.slice(1));
    }
  }

  const app_ = "app" in app ? app.app : app;

  let expandedApp = app_;
  let expandingNode = (A.view(app_) as A.Outline).root;

  for (let i = 0; i < path.length; ++i) {
    const part = path[i];
    const pathPrefix = path.slice(0, i);

    if (typeof part === "object") {
      expandedApp = A.update(expandedApp, {type: "toggle-references", id: findItemAt(expandingNode, [part])!.id});
    } else {
      expandedApp = A.update(expandedApp, {
        type: "click-bullet",
        alt: false,
        id: findItemAt(expandingNode, [part])!.id,
      });
    }

    expandingNode = findItemAt((A.view(expandedApp) as A.Outline).root, [...pathPrefix, part])!;
  }

  return expandingNode;
}

export function expectItemAtToMatch(
  app: A.App | W.Wrapap,
  path: (number | [typeof $reference, number])[],
  expected: any,
) {
  expectMatch(itemAt(app, path), expected);
}
