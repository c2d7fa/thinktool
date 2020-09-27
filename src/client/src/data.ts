import {Communication} from "@thinktool/shared";
import * as Misc from "@johv/miscjs";

export type Content = Communication.Content;

export interface State {
  things: {[id: string]: ThingData | undefined};
  connections: {[connectionId: string]: ConnectionData | undefined};
}

export type Connection = {connectionId: string};

export interface ThingData {
  content: Content;
  children: Connection[];
  parents: Connection[];
  isPage: boolean;
}

export interface ConnectionData {
  parent: string;
  child: string;
}

//#region Fundamental operations

export const empty: State = {
  things: {"0": {content: ["Welcome"], children: [], parents: [], isPage: false}},
  connections: {},
};

export function allThings(state: State): string[] {
  return Object.keys(state.things);
}

export function connectionParent(state: State, connection: Connection): string | undefined {
  return state.connections[connection.connectionId]?.parent;
}

export function connectionChild(state: State, connection: Connection): string | undefined {
  return state.connections[connection.connectionId]?.child;
}

export function childConnections(state: State, thing: string): Connection[] {
  const data = state.things[thing];
  if (data === undefined) {
    console.warn("Getting children of non-existent item %o", thing);
    return [];
  }
  return data.children;
}

export function content(state: State, thing: string): Content {
  const data = state.things[thing];
  if (data === undefined) {
    console.warn("Getting content of non-existent item %o", thing);
    return [];
  }
  return data.content ?? [];
}

export function setContent(state: State, thing: string, newContent: Content): State {
  if (state.things[thing] === undefined) console.warn("Setting content of non-existent item %o", thing);
  const oldThing = state.things[thing] ?? {content: [], children: [], parents: [], isPage: false};
  return {...state, things: {...state.things, [thing]: {...oldThing, content: newContent}}};
}

export function insertChild(
  state: State,
  parent: string,
  child: string,
  index: number,
  customConnectionId?: string,
): [State, Connection] {
  const parentData = state.things[parent];
  let childData = state.things[child];

  if (parentData === undefined) {
    throw "Tried to insert child into non-existent parent";
  }

  let result = state;
  const connectionId = customConnectionId ?? `c.${generateShortId()}`; // 'c.' prefix to tell where the ID came from when debugging.
  result = {
    ...result,
    connections: {...state.connections, [connectionId]: {parent, child}},
  };

  if (childData === undefined) {
    // We must store the child-to-parent connection in the child node; however,
    // sometimes it makes sense to add a parent before its child, for example
    // when loading a cyclic structure. Thus, we may need to create the child
    // first.
    result = create(result, child)[0];
    childData = result.things[child]!;
  }

  result = {
    ...result,
    things: {
      ...result.things,
      [child]: {
        ...childData,
        parents: [{connectionId}, ...childData.parents],
      },
    },
  };

  result = {
    ...result,
    things: {
      ...result.things,
      [parent]: {
        ...parentData,
        children: Misc.splice(parentData.children, index, 0, {connectionId}),
      },
    },
  };

  return [result, {connectionId}];
}

export function removeChild(state: State, parent: string, index: number): State {
  const parentData = state.things[parent];
  if (parentData === undefined) throw "Tried to remove item from non-existent parent";

  let result = state;

  const removedConnection = parentData.children[index]; // Connection to remove
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
  const childData = result.things[child];
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
    things: {
      ...result.things,
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

  result = {
    ...result,
    things: {
      ...result.things,
      [child]: {
        ...childData,
        parents: Misc.removeBy(
          childData.parents,
          removedConnection,
          (x, y) => x.connectionId === y.connectionId,
        ),
      },
    },
  };

  result = {...result, connections: Misc.removeKey(result.connections, removedConnection.connectionId)};

  return result;
}

export function create(state: State, customId?: string): [State, string] {
  const newId = customId ?? generateShortId();
  return [
    {...state, things: {...state.things, [newId]: {content: [], children: [], parents: [], isPage: false}}},
    newId,
  ];
}

export function forget(state: State, thing: string): State {
  // It should not be possible to permanently remove the root item.
  if (thing === "0") return state;

  const result = {...state, things: {...state.things}};
  delete result.things[thing];
  return result;
}

export function exists(state: State, thing: string): boolean {
  return state.things[thing] !== undefined;
}

export function parents(state: State, child: string): string[] {
  let result: string[] = [];

  for (const parent of state.things[child]?.parents ?? []) {
    const parentThing = connectionParent(state, parent);
    if (parentThing !== undefined) result.push(parentThing);
  }

  return result;
}

export function isPage(state: State, thing: string): boolean {
  return state.things[thing]?.isPage ?? false;
}

export function togglePage(state: State, thing: string): State {
  const oldThing = state.things[thing];
  if (oldThing === undefined) return state;
  return {...state, things: {...state.things, [thing]: {...oldThing, isPage: !oldThing.isPage}}};
}

//#endregion

export function children(state: State, thing: string): string[] {
  let result: string[] = [];

  for (const child of state.things[thing]?.children ?? []) {
    const childThing = connectionChild(state, child);
    if (childThing !== undefined) result.push(childThing);
  }

  return result;
}

export function hasChildren(things: State, thing: string): boolean {
  return children(things, thing).length !== 0;
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

  return forget(newState, removedThing);
}

export function otherParents(state: State, child: string, parent?: string): string[] {
  return parents(state, child).filter((p) => p !== parent);
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

// In-line references
//
// Items may reference other items in their content. Such items are displayed
// with the referenced item embedded where the reference is.

export function references(state: State, thing: string): string[] {
  let result: string[] = [];

  for (const segment of content(state, thing)) {
    if (typeof segment.link === "string") {
      result = [...result, segment.link];
    }
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
