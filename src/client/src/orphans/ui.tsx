import * as React from "react";

import * as D from "../data";

import * as O from "./core";

export type OrphanListItem = {title: string};

export function useOrphanListPropsFromState(state: D.State): Parameters<typeof OrphanList>[0] {
  const [items, setItems] = React.useState<OrphanListItem[]>([]);

  function rescan() {
    setItems((items) => [...items, {title: "Item " + Math.floor(Math.random() * 10000)}]);
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
