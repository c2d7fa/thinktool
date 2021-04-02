import * as React from "react";

import * as A from "../app";

export type OrphanListItem = {title: string};

export function useOrphanListProps(app: A.App, updateApp: (f: (app: A.App) => A.App) => void) {
  return {items: app.orphans};
}

export function OrphanList(props: {items: OrphanListItem[]}) {
  if (props.items.length === 0)
    return <div>If you have any items that are not accissble from the root item, they will be listed here.</div>;

  return (
    <div>
      <ul>
        {props.items.map((orphan) => (
          <li>{orphan.title}</li>
        ))}
      </ul>
    </div>
  );
}
