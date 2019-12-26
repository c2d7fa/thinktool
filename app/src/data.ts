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

export function setContent(things: Things, thing: number, newContent: string): void {
  // TODO: Handle case where there is no such thing.
  things[thing].content = newContent;
}
