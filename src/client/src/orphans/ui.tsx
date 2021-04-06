import * as React from "react";

import Bullet from "../ui/Bullet";

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

    onVisit(thing: string) {
      updateApp((app) => A.jump(A.switchTab(app, "outline"), thing));
    },
  };
}

export function OrphanList(props: {
  items: OrphanListItem[];
  onDestroy(thing: string): void;
  onVisit(thing: string): void;
}) {
  if (props.items.length === 0)
    return (
      <div className="inbox empty">
        If you have any items that are not accessible from the root item, they will be listed here.
      </div>
    );

  return (
    <div className="inbox">
      {props.items.map((orphan) => (
        <div className="inbox-card">
          <div className="card-item">
            <Bullet
              status="collapsed"
              beginDrag={() => {}}
              toggle={() => props.onVisit(orphan.thing)}
              onMiddleClick={() => props.onVisit(orphan.thing)}
            />
            <span className="title">{orphan.title}</span>
          </div>
          <div className="buttons">
            <button onClick={() => props.onVisit(orphan.thing)}>
              <span className="icon fas fa-fw fa-hand-point-right" /> Jump
            </button>
            <button onClick={() => props.onDestroy(orphan.thing)}>
              <span className="icon fas fa-fw fa-trash" /> Destroy
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
