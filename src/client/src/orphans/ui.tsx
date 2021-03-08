import * as React from "react";

import * as D from "../data";

import * as OC from "./core";
import * as OI from "./integration";

export type OrphanListItem = {title: string};

export function useOrphanListPropsFromState(state: D.State): Parameters<typeof OrphanList>[0] {
  const [items, setItems] = React.useState<OrphanListItem[]>([]);

  function rescan() {
    const graph = OI.fromState(state);
    const orphans = OC.scan(graph);
    setItems(
      OC.ids(orphans)
        .map((id) => ({title: graph.textContent(id)}))
        .toArray(),
    );
  }

  return {items, rescan};
}

export function OrphanList(props: {items: OrphanListItem[]; rescan(): void}) {
  return (
    <div>
      <button onClick={props.rescan}>rescan</button>
      <ul>
        {props.items.map((orphan) => (
          <li>{orphan.title}</li>
        ))}
      </ul>
    </div>
  );
}
