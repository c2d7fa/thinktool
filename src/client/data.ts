import * as G from "../shared/general";

export interface State {
  things: {[id: string]: ThingData};
  connections: {[connectionId: number]: ConnectionData};
  nextConnectionId: number;
}

export type Connection = {connectionId: number};

export interface ThingData {
  content: string;
  connections: Connection[];
}

export interface ConnectionData {
  parent: string;
  child: string;
  tag: string | null; // null is used for neutral parent-child relationship.
}

export interface State {
  things: {[id: string]: ThingData};
}

//#region Fundamental operations

export const empty: State = {things: {"0": {content: "root", connections: []}}, connections: {}, nextConnectionId: 0};

export function connectionParent(state: State, connection: Connection): string { return state.connections[connection.connectionId].parent; }
export function connectionChild(state: State, connection: Connection): string { return state.connections[connection.connectionId].child; }

export function childConnections(state: State, thing: string): Connection[] {
  if (!exists(state, thing)) return [];
  return state.things[thing].connections.filter(c => connectionParent(state, c) === thing);
}

export function content(things: State, thing: string): string {
  if (!exists(things, thing)) return "";
  return things.things[thing].content;
}

export function setContent(state: State, thing: string, newContent: string): State {
  return {...state, things: {...state.things, [thing]: {...state.things[thing], content: newContent}}};
}

export function insertChild(state: State, parent: string, child: string, index: number): [State, Connection] {
  let result = {...state, nextConnectionId: state.nextConnectionId + 1};
  result = {...result, connections: {...state.connections, [state.nextConnectionId]: {parent, child, tag: null}}};
  if (!exists(result, child)) {
    // We must store the child-to-parent connection in the child node; however,
    // sometimes it makes sense to add a parent before its child, for example
    // when loading a cyclic structure. Thus, we may need to create the child
    // first.
    result = create(result, child)[0]
  }
  result = {...result, things: {...result.things, [child]: {...result.things[child], connections: G.splice(result.things[child].connections, index, 0, {connectionId: state.nextConnectionId})}}};
  result = {...result, things: {...result.things, [parent]: {...result.things[parent], connections: G.splice(result.things[parent].connections, index, 0, {connectionId: state.nextConnectionId})}}};
  return [result, {connectionId: state.nextConnectionId}];
}

export function removeChild(state: State, parent: string, index: number) {
  let result = state;
  const removedConnection = state.things[parent].connections[index]; // Connection to remove
  const child = connectionChild(state, removedConnection);
  result = {...result, things: {...result.things, [parent]: {...result.things[parent], connections: G.removeBy(result.things[parent].connections, removedConnection, (x, y) => x.connectionId === y.connectionId)}}};
  result = {...result, things: {...result.things, [child]: {...result.things[child], connections: G.removeBy(result.things[child].connections, removedConnection, (x, y) => x.connectionId === y.connectionId)}}};
  result = {...result, connections: G.removeKeyNumeric(result.connections, removedConnection.connectionId)};
  return result;
}

export function create(state: State, customId?: string): [State, string] {
  const newId = customId ?? generateShortId();
  return [{...state, things: {...state.things, [newId]: {content: "", connections: []}}}, newId];
}

export function forget(state: State, thing: string): State {
  const result = {...state, things: {...state.things}};
  delete result.things[thing];
  return result;
}

export function exists(state: State, thing: string): boolean {
  return typeof state.things[thing] === "object";
}

export function parents(state: State, child: string): string[] {
  if (!exists(state, child)) return [];
  return state.things[child].connections.filter(c => connectionChild(state, c) === child).map(c => connectionParent(state, c));
}

export function setTag(state: State, connection: Connection, tag: string | null): State {
  return {...state, connections: {...state.connections, [connection.connectionId]: {...state.connections[connection.connectionId], tag}}};
}

export function tag(state: State, connection: Connection): string | null {
  return state.connections[connection.connectionId].tag;
}

//#endregion

export function children(state: State, thing: string): string[] {
  return childConnections(state, thing).map(c => connectionChild(state, c));
}

export function hasChildren(things: State, thing: string): boolean {
  return children(things, thing).length !== 0;
}

export function addChild(things: State, parent: string, child: string): [State, Connection] {
  return insertChild(things, parent, child, children(things, parent).length);
}

export function replaceChildren(state: State, parent: string, newChildren: string[]) {
  let result = state;

  // Remove old children
  for (let i = 0; i < children(state, parent).length; ++i) {
    result = removeChild(result, parent, 0);
  }

  // Add new children
  for (const child of newChildren) {
    result = addChild(result, parent, child)[0];
  }

  return result
}

function generateShortId(): string {
  const d = Math.floor((new Date().getTime()) / 1000) % (36 * 36 * 36 * 36 * 36 * 36);
  const r = Math.floor(Math.random() * 36 * 36);
  const x = (d * 36 * 36) + r;
  return x.toString(36);
}

export function remove(state: State, removedThing: string): State {
  let newState = state;
  for (const parent of parents(newState, removedThing)) {
    if (!exists(newState, parent)) continue;
    while (children(newState, parent).includes(removedThing)) {
      newState = removeChild(newState, parent, G.indexOfBy(children(newState, parent), removedThing)!);
    }
  }
  return forget(newState, removedThing);
}

export function otherParents(state: State, child: string, parent?: string): string[] {
  return parents(state, child).filter(p => p !== parent);
}

// Search

export function contentText(state: State, thing: string): string {
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
export function search(state: State, text: string): string[] {
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

export function references(state: State, thing: string): string[] {
  let result: string[] = [];
  for (const referenceMatch of content(state, thing).matchAll(/#([a-z0-9]+)/g)) {
    if (typeof referenceMatch[1] !== "string") throw "bad programmer error";
    result = [...result, referenceMatch[1]];
  }
  return result;
}

export function backreferences(state: State, thing: string): string[] {
  let result: string[] = [];
  for (const other in state.things) {
    if (references(state, other).includes(thing)) {
      result = [...result, other];
    }
  }
  return result;
}
