import {General as G, Communication} from "thinktool-shared";

export type Content = Communication.Content;

export interface State {
  things: {[id: string]: ThingData};
  connections: {[connectionId: string]: ConnectionData};
}

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

//#region Fundamental operations

export const empty: State = {
  things: {"0": {content: ["Welcome"], children: [], parents: []}},
  connections: {},
};

export function connectionParent(state: State, connection: Connection): string {
  return state.connections[connection.connectionId].parent;
}

export function connectionChild(state: State, connection: Connection): string {
  return state.connections[connection.connectionId].child;
}

export function childConnections(state: State, thing: string): Connection[] {
  if (!exists(state, thing)) return [];
  return state.things[thing].children;
}

export function content(things: State, thing: string): Content {
  if (!exists(things, thing)) return [];
  return things.things[thing].content;
}

export function setContent(state: State, thing: string, newContent: Content): State {
  return {...state, things: {...state.things, [thing]: {...state.things[thing], content: newContent}}};
}

export function insertChild(
  state: State,
  parent: string,
  child: string,
  index: number,
  customConnectionId?: string,
): [State, Connection] {
  let result = state;
  const connectionId = customConnectionId ?? `c.${generateShortId()}`; // 'c.' prefix to tell where the ID came from when debugging.
  result = {
    ...result,
    connections: {...state.connections, [connectionId]: {parent, child}},
  };
  if (!exists(result, child)) {
    // We must store the child-to-parent connection in the child node; however,
    // sometimes it makes sense to add a parent before its child, for example
    // when loading a cyclic structure. Thus, we may need to create the child
    // first.
    result = create(result, child)[0];
  }
  result = {
    ...result,
    things: {
      ...result.things,
      [child]: {
        ...result.things[child],
        parents: [{connectionId}, ...result.things[child].parents],
      },
    },
  };
  result = {
    ...result,
    things: {
      ...result.things,
      [parent]: {
        ...result.things[parent],
        children: G.splice(result.things[parent].children, index, 0, {connectionId}),
      },
    },
  };
  return [result, {connectionId}];
}

export function removeChild(state: State, parent: string, index: number) {
  let result = state;
  const removedConnection = state.things[parent].children[index]; // Connection to remove
  const child = connectionChild(state, removedConnection);
  result = {
    ...result,
    things: {
      ...result.things,
      [parent]: {
        ...result.things[parent],
        children: G.removeBy(
          result.things[parent].children,
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
        ...result.things[child],
        parents: G.removeBy(
          result.things[child].parents,
          removedConnection,
          (x, y) => x.connectionId === y.connectionId,
        ),
      },
    },
  };
  result = {...result, connections: G.removeKey(result.connections, removedConnection.connectionId)};
  return result;
}

export function create(state: State, customId?: string): [State, string] {
  const newId = customId ?? generateShortId();
  return [{...state, things: {...state.things, [newId]: {content: [], children: [], parents: []}}}, newId];
}

export function forget(state: State, thing: string): State {
  // It should not be possible to permanently remove the root item.
  if (thing === "0") return state;

  const result = {...state, things: {...state.things}};
  delete result.things[thing];
  return result;
}

export function exists(state: State, thing: string): boolean {
  return typeof state.things[thing] === "object";
}

export function parents(state: State, child: string): string[] {
  if (!exists(state, child)) return [];
  return state.things[child].parents.map((c) => connectionParent(state, c));
}

//#endregion

export function children(state: State, thing: string): string[] {
  return childConnections(state, thing).map((c) => connectionChild(state, c));
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
    if (!exists(newState, parent)) continue;
    while (children(newState, parent).includes(removedThing)) {
      newState = removeChild(newState, parent, G.indexOfBy(children(newState, parent), removedThing)!);
    }
  }

  return forget(newState, removedThing);
}

export function otherParents(state: State, child: string, parent?: string): string[] {
  return parents(state, child).filter((p) => p !== parent);
}

// Search

export function contentText(state: State, thing: string): string {
  function contentText_(thing: string, seen: string[]): string {
    if (seen.includes(thing)) return "...";

    let result = "";
    for (const segment of content(state, thing)) {
      if (typeof segment === "string") result += segment;
      else if (typeof segment.link === "string") result += contentText_(segment.link, [...seen, thing]);
    }

    return result;
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
