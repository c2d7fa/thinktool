export interface ThingData {
  content: string;
  children: number[];
}

export interface Things {
  next: number;
  things: {[thing: number]: ThingData};
}

export function children(things: Things, thing: number): number[] {
  return things.things[thing].children;
}

export function content(things: Things, thing: number): string {
  return things.things[thing].content;
}

export function setContent(things: Things, thing: number, newContent: string): Things {
  return {...things, things: {...things.things, [thing]: {...things.things[thing], content: newContent}}};
}

export function hasChildren(things: Things, thing: number): boolean {
  return children(things, thing).length !== 0;
}

export function addChild(things: Things, parent: number, child: number): Things {
  return {...things, things: {...things.things, [parent]: {...things.things[parent], children: [...things.things[parent].children, child]}}};
}

// Make the given child a child of its previous sibling.
export function indent(things: Things, parent: number, index: number): Things {
  const result: Things = {...things, things: {...things.things, [parent]: {...things.things[parent], children: [...things.things[parent].children]}}};
  result.things[parent].children.splice(index, 1);

  const newParent = things.things[parent].children[index - 1];
  const child = things.things[parent].children[index];
  return addChild(result, newParent, child);
}

// Make the given child a sibling of its parent.
export function unindent(things: Things, grandparent: number, parentIndex: number, index: number): Things {
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

export function removeChild(state: Things, parent: number, index: number) {
  const result = {...state, things: {...state.things, [parent]: {...state.things[parent], children: [...state.things[parent].children]}}};
  result.things[parent].children.splice(index, 1);
  return result;
}

export function insertChild(state: Things, parent: number, child: number, index: number) {
  const result = {...state, things: {...state.things, [parent]: {...state.things[parent], children: [...state.things[parent].children]}}};
  result.things[parent].children.splice(index, 0, child);
  return result;
}

export function create(state: Things): [Things, number] {
  const next = state.next + 1;
  return [{...state, next: next + 1, things: {...state.things, [next]: {content: "", children: []}}}, next];
}
