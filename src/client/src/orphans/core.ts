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

// Find items not reacable from the root by following children, parents, links
// and references.
export function scan(graph: Graph): Immutable.Set<Id> {
  return graph.all().subtract(Immutable.Set(graph.root()));
}
