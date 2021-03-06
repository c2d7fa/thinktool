import * as Immutable from "immutable";

export type Id = string;

export interface Graph {
  all(): Immutable.Set<Id>;
  root(): Id;

  children(item: Id): Immutable.Set<Id>;
  parents(item: Id): Immutable.Set<Id>;
  links(item: Id): Immutable.Set<Id>;
  references(item: Id): Immutable.Set<Id>;
}

// We store the result of scanning for orphans in this indirect data structure.
// The reason is that we will probably want to introduce some state later. For
// example, instead of doing a full rescan when a child connection is created,
// we could just incrementally update the state with this new connection.

const _ids = Symbol("ids");

export type Orphans = {[_ids]: Immutable.Set<Id>};

// Find items not reacable from the root by following children, parents, links
// and references.
export function scan(graph: Graph): Orphans {
  const reached = Immutable.Set<Id>([]).asMutable();

  function reach(root: Id): void {
    if (reached.has(root)) return;
    reached.add(root);
    for (const child of graph.children(root)) reach(child);
    for (const link of graph.links(root)) reach(link);
    for (const parents of graph.parents(root)) reach(parents);
    for (const reference of graph.references(root)) reach(reference);
  }

  reach(graph.root());

  return {[_ids]: graph.all().subtract(reached)};
}

export function ids(orphans: Orphans): Immutable.Set<Id> {
  return orphans[_ids];
}

export function removeOrphanWithoutRefresh(orphans: Orphans, id: string): Orphans {
  return {[_ids]: orphans[_ids].filter((id_) => id_ !== id)};
}
