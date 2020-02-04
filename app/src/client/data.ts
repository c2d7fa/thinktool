export interface ThingData {
  content: string;
  children: string[];
  page?: string;
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

export function page(things: Things, thing: string): string | null {
  if (!exists(things, thing)) return "";
  return things.things[thing].page  ?? null;
}

export function setPage(things: Things, thing: string, page: string): Things {
  return {...things, things: {...things.things, [thing]: {...things.things[thing], page}}};
}

export function removePage(things: Things, thing: string): Things {
  return {...things, things: {...things.things, [thing]: {...things.things[thing], page: undefined}}};
}

export function hasChildren(things: Things, thing: string): boolean {
  return children(things, thing).length !== 0;
}

export function addChild(things: Things, parent: string, child: string): Things {
  return {...things, things: {...things.things, [parent]: {...things.things[parent], children: [...things.things[parent].children, child]}}};
}

// Make the given child a child of its previous sibling.
export function indent(things: Things, parent: string, index: number): Things {
  const result: Things = {...things, things: {...things.things, [parent]: {...things.things[parent], children: [...things.things[parent].children]}}};
  result.things[parent].children.splice(index, 1);

  const newParent = things.things[parent].children[index - 1];
  const child = things.things[parent].children[index];
  return addChild(result, newParent, child);
}

// Make the given child a sibling of its parent.
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

export function removeChild(state: Things, parent: string, index: number) {
  const result = {...state, things: {...state.things, [parent]: {...state.things[parent], children: [...state.things[parent].children]}}};
  result.things[parent].children.splice(index, 1);
  return result;
}

export function insertChild(state: Things, parent: string, child: string, index: number) {
  const result = {...state, things: {...state.things, [parent]: {...state.things[parent], children: [...state.things[parent].children]}}};
  result.things[parent].children.splice(index, 0, child);
  return result;
}

function generateShortId(): string {
  const d = Math.floor((new Date().getTime()) / 1000) % (36 * 36 * 36 * 36 * 36 * 36);
  const r = Math.floor(Math.random() * 36 * 36);
  const x = (d * 36 * 36) + r;
  return x.toString(36);
}

export function create(state: Things): [Things, string] {
  const newId = generateShortId();
  return [{...state, things: {...state.things, [newId]: {content: "", children: []}}}, newId];
}

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

// Remove things that are not referred to anywhere.
export function cleanGarbage(state: Things, root: string): Things {
  const seen: {[k: string]: boolean} = {};
  function mark(root: string): void {
    if (seen[root]) return;
    seen[root] = true;
    for (const child of children(state, root))
      mark(child);
  }
  mark(root);

  const result = {...state, things: {...state.things}};

  for (const thing in state.things)
    if (!seen[thing] || !exists(state, thing))
      delete result.things[thing];

  return result;
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

export const empty: Things = {things: {"0": {content: "root", children: []}}};

// #region In-line references
//
// Items may reference other items in their content or pages. Such items are
// displayed with the referenced item embedded where the reference is.
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

// #endregion