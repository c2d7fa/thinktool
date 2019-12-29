import {Things} from "./data";

// Copying, removing and moving items

// TODO: I should think more about this interface. How can we better represent
// the tree as a value?

// Represents a thing in its exact location. This is invalidated whenever parent
// has its list of children modified.
export type Place = {parent: number; index: number};

export function copy(state: Things, source: Place, target: Place): void {
  state[target.parent].children.splice(target.index, 0, state[source.parent].children[source.index]);
}

export function remove(state: Things, item: Place): void {
  state[item.parent].children.splice(item.index, 1);
}

export function move(state: Things, source: Place, target: Place): void {
  copy(state, source, target);
  if (source.parent === target.parent) {
    if (target.index <= source.index) {
      remove(state, {parent: source.parent, index: source.index + 1});
    } else {
      remove(state, source);
    }
  } else {
    remove(state, source);
  }
}

export function moveUp(state: Things, item: Place): void {
  move(state, item, {parent: item.parent, index: Math.max(0, item.index - 1)});
}

export function moveDown(state: Things, item: Place): void {
  // TODO: I don't understand why this works.
  move(state, item, {parent: item.parent, index: item.index + 2});
}
