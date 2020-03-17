export interface Things {
  things: {[id: string]: ThingData};
}

export interface ThingData {
  content: string;
  children: string[];
}

export interface Things {
  things: {[id: string]: ThingData};
}

//#region Fundamental operations

export const empty: Things = {things: {"0": {content: "root", children: []}}};

export function children(things: Things, thing: string): string[] {
  if (!exists(things, thing)) return [];
  return things.things[thing].children;
}

export function content(things: Things, thing: string): string {
  if (!exists(things, thing)) return "";
  return things.things[thing].content;
}

export function setContent(things: Things, thing: string, newContent: string): Things {
  return {...things, things: {...things.things, [thing]: {...things.things[thing], content: newContent}}};
}

export function insertChild(state: Things, parent: string, child: string, index: number) {
  const result = {...state, things: {...state.things, [parent]: {...state.things[parent], children: [...state.things[parent].children]}}};
  result.things[parent].children.splice(index, 0, child);
  return result;
}

export function removeChild(state: Things, parent: string, index: number) {
  const result = {...state, things: {...state.things, [parent]: {...state.things[parent], children: [...state.things[parent].children]}}};
  result.things[parent].children.splice(index, 1);
  return result;
}

export function create(state: Things, customId?: string): [Things, string] {
  const newId = customId ?? generateShortId();
  return [{...state, things: {...state.things, [newId]: {content: "", children: []}}}, newId];
}

export function forget(state: Things, thing: string): Things {
  const result = {...state, things: {...state.things}};
  delete result[thing];
  return result;
}

export function exists(state: Things, thing: string): boolean {
  return typeof state.things[thing] === "object";
}

//#endregion

export function hasChildren(things: Things, thing: string): boolean {
  return children(things, thing).length !== 0;
}

export function addChild(things: Things, parent: string, child: string): Things {
  return insertChild(things, parent, child, children(things, parent).length);
}

export function replaceChildren(state: Things, parent: string, newChildren: string[]) {
  let result = state;

  // Remove old children
  for (let i = 0; i < children(state, parent).length; ++i) {
    result = removeChild(result, parent, 0);
  }

  // Add new children
  for (const child of newChildren) {
    result = addChild(result, parent, child);
  }

  return result
}

function generateShortId(): string {
  const d = Math.floor((new Date().getTime()) / 1000) % (36 * 36 * 36 * 36 * 36 * 36);
  const r = Math.floor(Math.random() * 36 * 36);
  const x = (d * 36 * 36) + r;
  return x.toString(36);
}

export function remove(state: Things, removedThing: string): Things {
  let newState = state;
  for (const thing in state.things) {
    if (!exists(state, thing)) continue;
    const newChildren = children(state, thing).filter(child => child !== removedThing);
    newState = replaceChildren(newState, thing, newChildren);
  }
  return forget(newState, removedThing);
}

export function parents(state: Things, child: string): string[] {
  const result: string[] = [];

  for (const thing in state.things) {
    if (!exists(state, thing))
      continue;
    if (children(state, thing).includes(child))
      result.push(thing);
  }

  return result;
}

export function otherParents(state: Things, child: string, parent?: string): string[] {
  return parents(state, child).filter(p => p !== parent);
}

// Search

export function contentText(state: Things, thing: string): string {
  function contentText_(thing: string, seen: string[]): string {
    return content(state, thing).replace(/#([a-z0-9]+)/g, (match: string, thing: string, offset: number, string: string) => {
      if (seen.includes(thing)) return "...";
      return contentText_(thing, [...seen, thing]);
    });
  }

  return contentText_(thing, []);
}

// TODO: We should use some kind of streaming data structure for search results,
// so that we don't have to wait for the entire thing before we can display
// something to the user.
export function search(state: Things, text: string): string[] {
  let results: string[] = [];
  for (const thing in state.things) {
    if (contentText(state, thing).toLowerCase().includes(text.toLowerCase())) {
      results = [...results, thing];
    }
  }
  return results;
}

// In-line references
//
// Items may reference other items in their content. Such items are displayed
// with the referenced item embedded where the reference is.
//
// We currently use a pretty lazy way of implementing this: References are
// simply stored as part of the string in the format '#<ITEM ID>', e.g.
// '#q54vf530'.

export function references(state: Things, thing: string): string[] {
  let result: string[] = [];
  for (const referenceMatch of content(state, thing).matchAll(/#([a-z0-9]+)/g)) {
    if (typeof referenceMatch[1] !== "string") throw "bad programmer error";
    result = [...result, referenceMatch[1]];
  }
  return result;
}

export function backreferences(state: Things, thing: string): string[] {
  let result: string[] = [];
  for (const other in state.things) {
    if (references(state, other).includes(thing)) {
      result = [...result, other];
    }
  }
  return result;
}
