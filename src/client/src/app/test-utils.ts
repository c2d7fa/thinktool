import * as A from "./index";
import * as D from "../data";
import * as T from "../tree";

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

export function expectViewToMatch(app: A.App, expected: any): void {
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

  const view = A.view(app);
  return expectMatch(view, expected);
}
