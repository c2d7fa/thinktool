import * as Immutable from "immutable";
import * as D from "../data";

const _ids = Symbol("ids");
export type Orphans = {[_ids]: Immutable.Set<string>};

// Find items not reacable from the root by following children, parents, links
// and references.
export function scan(graph: D.State): Orphans {
  const reached = Immutable.Set<string>([]).asMutable();

  function reach(root: string): void {
    if (reached.has(root)) return;
    reached.add(root);
    for (const child of D.children(graph, root)) reach(child);
    for (const link of D.references(graph, root)) reach(link);
    for (const parents of D.parents(graph, root)) reach(parents);
    for (const reference of D.backreferences(graph, root)) reach(reference);
  }

  reach(D.root(graph));

  return {[_ids]: Immutable.Set(D.allThings(graph)).subtract(reached)};
}

function ids(orphans: Orphans): Immutable.Set<string> {
  return orphans[_ids];
}

function removeOrphanWithoutRefresh(orphans: Orphans, id: string): Orphans {
  return {[_ids]: orphans[_ids].filter((id_) => id_ !== id)};
}
