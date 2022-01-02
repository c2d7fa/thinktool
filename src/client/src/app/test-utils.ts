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
