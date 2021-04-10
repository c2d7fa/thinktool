import * as React from "react";

import Bullet from "../ui/Bullet";
import {OtherParents} from "../ui/OtherParents";

import * as A from "../app";
import * as D from "../data";
import * as P from "../popup";
import * as O from ".";

export type OrphanListItem = {
  title: string;
  thing: string;
  parents: {id: string; text: string}[];
  hasChildren: boolean;
};

export function useOrphanListProps(
  app: A.App,
  updateApp: (f: (app: A.App) => A.App) => void,
): Parameters<typeof OrphanList>[0] {
  return {
    items: O.ids(app.orphans)
      .map((thing) => ({
        title: D.contentText(app.state, thing),
        thing,
        parents: D.parents(app.state, thing).map((p) => ({id: p, text: D.contentText(app.state, p)})),
        hasChildren: D.hasChildren(app.state, thing),
      }))
      .toArray()
      .sort((a, b) => a.title.localeCompare(b.title)),

    onDestroy(thing: string) {
      updateApp((app) => O.destroy(app, thing));
    },

    onAddParent(thing: string) {
      updateApp((app) =>
        A.merge(app, {
          popup: P.open(app.popup, {
            query: "",
            select(app, parent) {
              return O.addParent(app, thing, parent);
            },
          }),
        }),
      );
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
  onAddParent(thing: string): void;
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
            <OtherParents otherParents={orphan.parents} click={props.onVisit} altClick={props.onVisit} />
            <Bullet
              status={orphan.hasChildren ? "collapsed" : "terminal"}
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
            <button onClick={() => props.onAddParent(orphan.thing)}>
              <span className="icon fas fa-fw fa-chevron-circle-up" /> Connect
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
