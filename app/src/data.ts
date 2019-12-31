export interface ThingData {
  content: string;
  children: number[];
}

export interface Things {
  [thing: number]: ThingData;
}

export function children(things: Things, thing: number): number[] {
  return things[thing].children;
}

export function content(things: Things, thing: number): string {
  return things[thing].content;
}

export function setContent(things: Things, thing: number, newContent: string): Things {
  return {...things, [thing]: {...things[thing], content: newContent}};
}

export function hasChildren(things: Things, thing: number): boolean {
  return children(things, thing).length !== 0;
}

export function addChild(things: Things, parent: number, child: number): Things {
  return {...things, [parent]: {...things[parent], children: [...things[parent].children, child]}};
}

// Make the given child a child of its previous sibling.
export function indent(things: Things, parent: number, index: number): Things {
  const result: Things = {...things, [parent]: {...things[parent], children: [...things[parent].children]}};
  result[parent].children.splice(index, 1);

  const newParent = things[parent].children[index - 1];
  const child = things[parent].children[index];
  return addChild(result, newParent, child);
}
