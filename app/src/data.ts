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

// Copying, removing and moving items

// TODO: This interface is pretty messy.

// Represents a thing in its exact location. We store the state, because
// {parent, index} would be invalidated whenever the state changes.
type ThingInTree = {state: Things; parent: number; index: number};
type LocationInTree = {parent: number; index: number};

// TODO: Weird interface. We are passing State twice, but I don't think we want
// to modify the state that we get from source, right?
function copy(state: Things, source: ThingInTree, target: LocationInTree): void {
  state[target.parent].children.splice(target.index, 0, state[source.parent].children[source.index]);
}

function remove(state: Things, item: ThingInTree): void {
  state[item.parent].children.splice(item.index, 1);
}

function move(state: Things, source: ThingInTree, target: LocationInTree): void {
  copy(state, source, target);
  if (source.parent === target.parent) {
    if (target.index <= source.index) {
      remove(state, {state, parent: source.parent, index: source.index + 1});
    } else {
      remove(state, source);
    }
  } else {
    remove(state, source);
  }
}
