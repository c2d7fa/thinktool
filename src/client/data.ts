export interface ThingData {
  content: string;
  children: string[];
}

export interface Things {
  things: {[id: string]: ThingData};
}

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

export function hasChildren(things: Things, thing: string): boolean {
  return children(things, thing).length !== 0;
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

export function addChild(things: Things, parent: string, child: string): Things {
  return insertChild(things, parent, child, children(things, parent).length)
}

// Make the given child a child of its previous sibling.
// [TODO] Implement in terms of insertChild and removeChild.
export function indent(things: Things, parent: string, index: number): Things {
  const result: Things = {...things, things: {...things.things, [parent]: {...things.things[parent], children: [...things.things[parent].children]}}};
  result.things[parent].children.splice(index, 1);

  const newParent = things.things[parent].children[index - 1];
  const child = things.things[parent].children[index];
  return addChild(result, newParent, child);
}

// Make the given child a sibling of its parent.
// [TODO] Implement in terms of insertChild and removeChild.
export function unindent(things: Things, grandparent: string, parentIndex: number, index: number): Things {
  const thing = children(things, children(things, grandparent)[parentIndex])[index];

  // Remove the child from its parent
  const parent = children(things, grandparent)[parentIndex];
  let result: Things = {...things, things: {...things.things, [parent]: {...things.things[parent], children: [...things.things[parent].children]}}};
  result.things[parent].children.splice(index, 1);

  // Make it a child of the grandparent following the parent
  result = {...result, things: {...result.things, [grandparent]: {...things.things[grandparent], children: [...things.things[grandparent].children]}}};
  result.things[grandparent].children.splice(parentIndex + 1, 0, thing);

  return result;
}

// [TODO] Implement in terms of insertChild and removeChild.
export function replaceChildren(state: Things, parent: string, children: string[]) {
  return {...state, things: {...state.things, [parent]: {...state.things[parent], children}}};
}

function generateShortId(): string {
  const d = Math.floor((new Date().getTime()) / 1000) % (36 * 36 * 36 * 36 * 36 * 36);
  const r = Math.floor(Math.random() * 36 * 36);
  const x = (d * 36 * 36) + r;
  return x.toString(36);
}

export function create(state: Things, customId?: string): [Things, string] {
  const newId = customId ?? generateShortId();
  return [{...state, things: {...state.things, [newId]: {content: "", children: []}}}, newId];
}

// [TODO] Implement in terms of insertChild and removeChild.
export function remove(state: Things, removedThing: string): Things {
  let newState = state;
  for (const thing in state.things) {
    if (state.things[thing] === undefined) continue;
    const newChildren = state.things[thing].children.filter(child => child !== removedThing);
    newState = {...newState, things: {...newState.things, [thing]: {...newState.things[thing], children: newChildren}}};
  }
  delete newState.things[removedThing];
  return newState;
}

export function exists(state: Things, thing: string): boolean {
  return typeof state.things[thing] === "object";
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

export const empty: Things = {things: {"0": {content: "root", children: []}}};

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
