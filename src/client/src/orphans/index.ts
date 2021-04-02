import * as D from "../data";

import * as Integration from "./integration";
import * as Core from "./core";

export function scan(state: D.State): {title: string}[] {
  const graph = Integration.fromState(state);
  const orphans = Core.scan(graph);
  return Core.ids(orphans)
    .map((id) => ({title: graph.textContent(id)}))
    .toArray();
}
