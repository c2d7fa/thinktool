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
