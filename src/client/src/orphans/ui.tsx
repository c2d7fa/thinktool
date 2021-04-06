import * as React from "react";

import * as A from "../app";
import * as D from "../data";
import * as O from ".";

export type OrphanListItem = {title: string; thing: string};

export function useOrphanListProps(
  app: A.App,
  updateApp: (f: (app: A.App) => A.App) => void,
): Parameters<typeof OrphanList>[0] {
  return {
    items: O.ids(app.orphans)
      .map((thing) => ({title: D.contentText(app.state, thing), thing}))
      .toArray()
      .sort((a, b) => a.title.localeCompare(b.title)),

    onDestroy(thing: string) {
      updateApp((app) => O.destroy(app, thing));
    },
  };
}

export function OrphanList(props: {items: OrphanListItem[]; onDestroy(thing: string): void}) {
  if (props.items.length === 0)
    return (
      <div className="inbox empty">
        If you have any items that are not accessible from the root item, they will be listed here.
      </div>
    );

  return (
    <div className="inbox">
      {props.items.map((orphan) => (
        <div className="inbox-item">
          <span className="title">{orphan.title}</span>
          <div className="buttons">
            <button onClick={() => props.onDestroy(orphan.thing)}>Destroy</button>
          </div>
        </div>
      ))}
    </div>
  );
}
