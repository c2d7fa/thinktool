import * as Misc from "@johv/miscjs";
import * as Immutable from "immutable";
import {BinaryRelation} from "@johv/immutable-extras";

import * as Shared from "@thinktool/shared";
type FullStateResponse = Shared.Communication.FullStateResponse;

export type Connection = {connectionId: string};

export interface ThingData {
  content: Content;
  children: Connection[];
  parents: Connection[];
}

export interface ConnectionData {
  parent: string;
  child: string;
}

export type Content = Shared.Communication.Content;

export function contentEq(a: Content, b: Content): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; ++i) {
    if (typeof a[i] === "string" && a[i] !== b[i]) return false;
    if (typeof a[i] !== "string" && (typeof b[i] === "string" || a[i].link !== b[i].link)) return false;
  }

  return true;
}

export function contentText(state: State, thing: string): string {
  function contentText_(thing: string, seen: string[]): string {
    if (seen.includes(thing)) return "...";

    let result = "";
    for (const segment of content(state, thing)) {
      if (typeof segment === "string") {
        result += segment;
      } else if (typeof segment.link === "string") {
        if (exists(state, segment.link)) {
          result += contentText_(segment.link, [...seen, thing]);
        } else {
          result += `[${segment.link}]`;
        }
      }
    }

    return result;
  }

  return contentText_(thing, []);
}

// Items may reference other items in their content. Such items are displayed
// with the referenced item embedded where the reference is.

export function references(state: State, thing: string): string[] {
  return state._links.image(thing).toArray();
}

export function backreferences(state: State, thing: string): string[] {
  return state._links.preimage(thing).toArray();
}

export function linksInContent(content: Content): Immutable.Set<string> {
  function isLink(piece: Content[number]): piece is {link: string} {
    return typeof piece.link === "string";
  }

  return Immutable.Set<string>(content.filter(isLink).map((x) => x.link));
}

// By convention, a field that is prefixed with an underscore is understood to
// be "module private"; that is, is may not be mentioned outside of a module in
// the same directory as this file.

export interface State {
  _things: {[id: string]: ThingData | undefined};
  _connections: {[connectionId: string]: ConnectionData | undefined};
  _links: BinaryRelation<string, string>;
}

export const empty: State = {
  _things: {"0": {content: ["Welcome"], children: [], parents: []}},
  _connections: {},
  _links: BinaryRelation<string, string>(),
};

export function allThings(state: State): string[] {
  return Object.keys(state._things);
}

function connectionParent(state: State, connection: Connection): string | undefined {
  return state._connections[connection.connectionId]?.parent;
}

export function connectionChild(state: State, connection: Connection): string | undefined {
  return state._connections[connection.connectionId]?.child;
}

export function childConnections(state: State, thing: string): Connection[] {
  const data = state._things[thing];
  if (data === undefined) {
    console.warn("Getting children of non-existent item %o", thing);
    return [];
  }
  return data.children;
}

export function content(state: State, thing: string): Content {
  const data = state._things[thing];
  if (data === undefined) {
    console.warn("Getting content of non-existent item %o in %o", thing, state);
    return [];
  }
  return data.content ?? [];
}

export function setContent(state: State, thing: string, newContent: Content): State {
  if (state._things[thing] === undefined) console.warn("Setting content of non-existent item %o", thing);
  const oldThing = state._things[thing] ?? {content: [], children: [], parents: []};

  let newLinks = state._links;
  for (const link of linksInContent(newContent)) {
    newLinks = newLinks.relate(thing, link);
  }

  return {...state, _things: {...state._things, [thing]: {...oldThing, content: newContent}}, _links: newLinks};
}

export function insertChild(
  state: State,
  parent: string,
  child: string,
  index: number,
  customConnectionId?: string,
): [State, Connection] {
  const parentData = state._things[parent];
  let childData = state._things[child];

  if (parentData === undefined) {
    throw "Tried to insert child into non-existent parent";
  }

  let result = state;
  const connectionId = customConnectionId ?? `c.${generateShortId()}`; // 'c.' prefix to tell where the ID came from when debugging.
  result = {
    ...result,
    _connections: {...state._connections, [connectionId]: {parent, child}},
  };

  if (childData === undefined) {
    // We must store the child-to-parent connection in the child node; however,
    // sometimes it makes sense to add a parent before its child, for example
    // when loading a cyclic structure. Thus, we may need to create the child
    // first.
    result = create(result, child)[0];
    childData = result._things[child]!;
  }

  result = {
    ...result,
    _things: {
      ...result._things,
      [child]: {
        ...childData,
        parents: [{connectionId}, ...childData.parents],
      },
    },
  };

  result = {
    ...result,
    _things: {
      ...result._things,
      [parent]: {
        ...parentData,
        children: Misc.splice(parentData.children, index, 0, {connectionId}),
      },
    },
  };

  return [result, {connectionId}];
}

export function removeChild(state: State, parent: string, index: number): State {
  const parentData = state._things[parent];
  if (parentData === undefined) throw "Tried to remove item from non-existent parent";

  let result = state;

  // Remove connection from parent.
  const removedConnection = parentData.children[index]; // Connection to remove
  result = {
    ...result,
    _things: {
      ...result._things,
      [parent]: {
        ...parentData,
        children: Misc.removeBy(
          parentData.children,
          removedConnection,
          (x, y) => x.connectionId === y.connectionId,
        ),
      },
    },
  };

  // Remove connection from child. We can handle the case where the parent and
  // the child are the same item straight-forwardly.
  const child = connectionChild(state, removedConnection);
  if (child === undefined) {
    console.error(
      "While removing %o-th child from parent %o with %o, the child did not actually exist",
      index,
      parent,
      parentData,
    );
    return state;
  }
  const childData = result._things[child];
  if (childData === undefined) {
    console.error(
      "While removing %o-th child from parent %o with %o, the child was invalid",
      index,
      parent,
      parentData,
    );
    return state;
  }
  result = {
    ...result,
    _things: {
      ...result._things,
      [child]: {
        ...childData,
        parents: Misc.removeBy(childData.parents, removedConnection, (x, y) => x.connectionId === y.connectionId),
      },
    },
  };

  // Remove the connection itself.
  result = {...result, _connections: Misc.removeKey(result._connections, removedConnection.connectionId)};

  return result;
}

export function moveChild(
  state: State,
  from: {parent: string; index: number},
  to: {parent: string; index: number},
): [State, Connection] {
  const removedConnection = childConnections(state, from.parent)[from.index];

  const state1 = removeChild(state, from.parent, from.index);
  const [state2, connection] = insertChild(
    state1,
    to.parent,
    connectionChild(state, removedConnection)!,
    to.index,
    removedConnection.connectionId,
  );
  return [state2, connection];
}

export function create(state: State, customId?: string): [State, string] {
  const newId = customId ?? generateShortId();
  return [{...state, _things: {...state._things, [newId]: {content: [], children: [], parents: []}}}, newId];
}

function forget(state: State, thing: string): State {
  // It should not be possible to permanently remove the root item.
  if (thing === "0") return state;

  const result = {...state, _things: {...state._things}};
  delete result._things[thing];
  return result;
}

export function exists(state: State, thing: string): boolean {
  return state._things[thing] !== undefined;
}

export function parents(state: State, child: string): string[] {
  let result: string[] = [];

  for (const parent of state._things[child]?.parents ?? []) {
    const parentThing = connectionParent(state, parent);
    if (parentThing !== undefined) result.push(parentThing);
  }

  return result;
}

export function children(state: State, thing: string): string[] {
  let result: string[] = [];

  for (const child of state._things[thing]?.children ?? []) {
    const childThing = connectionChild(state, child);
    if (childThing !== undefined) result.push(childThing);
  }

  return result;
}

export function hasChildren(things: State, thing: string): boolean {
  return children(things, thing).length !== 0;
}

export function hasChildrenOrReferences(things: State, thing: string): boolean {
  return hasChildren(things, thing) || backreferences(things, thing).length > 0;
}

export function addChild(
  things: State,
  parent: string,
  child: string,
  customConnectionId?: string,
): [State, Connection] {
  return insertChild(things, parent, child, children(things, parent).length, customConnectionId);
}

function generateShortId(): string {
  const d = Math.floor(new Date().getTime() / 1000) % (36 * 36 * 36 * 36 * 36 * 36);
  const r = Math.floor(Math.random() * 36 * 36);
  const x = d * 36 * 36 + r;
  return x.toString(36);
}

export function remove(state: State, removedThing: string): State {
  let newState = state;

  for (const parent of parents(newState, removedThing)) {
    while (children(newState, parent).includes(removedThing)) {
      newState = removeChild(newState, parent, Misc.indexOfBy(children(newState, parent), removedThing)!);
    }
  }

  for (const child of children(newState, removedThing)) {
    while (parents(newState, child).includes(removedThing)) {
      newState = removeChild(newState, removedThing, Misc.indexOfBy(parents(newState, child), removedThing)!);
    }
  }

  return forget(newState, removedThing);
}

export function otherParents(state: State, child: string, parent?: string): string[] {
  return parents(state, child).filter((p) => p !== parent);
}

export function transformFullStateResponseIntoState(response: FullStateResponse): State {
  if (response.things.length === 0) return empty;

  // Re-initializing empty state so we can mutate it in this function for
  // performance reasons.
  let state: State = {
    _things: {"0": {content: [""], children: [], parents: []}},
    _connections: {},
    _links: BinaryRelation<string, string>(),
  };

  for (const thing of response.things) {
    if (!state._things[thing.name]) state._things[thing.name] = {children: [], content: [], parents: []};
    state._things[thing.name]!.content = [];
    state = setContent(state, thing.name, thing.content);
    for (const connection of thing.children) {
      state._connections[connection.name] = {parent: thing.name, child: connection.child};
      if (!state._things[connection.child])
        state._things[connection.child] = {children: [], content: [], parents: []};
      if (!state._things[connection.child]!.parents.map((p) => p.connectionId).includes(connection.name))
        state._things[connection.child]!.parents.push({connectionId: connection.name});
      if (!state._things[thing.name]!.children.map((p) => p.connectionId).includes(connection.name))
        state._things[thing.name]!.children.push({connectionId: connection.name});
    }
  }

  return state;
}

export function transformStateIntoFullStateResponse(state: State): FullStateResponse {
  const things: FullStateResponse["things"] = [];

  for (const name in state._things) {
    const thing = state._things[name]!;
    things.push({
      name,
      content: thing.content,
      children: thing.children.map((c) => ({
        name: c.connectionId,
        child: state._connections[c.connectionId]!.child,
      })),
    });
  }

  return {things};
}

export function root(state: State): string {
  return "0";
}
