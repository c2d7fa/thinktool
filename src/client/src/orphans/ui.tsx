import * as React from "react";

import Bullet from "../ui/Bullet";
import {OtherParents} from "../ui/OtherParents";

import * as A from "../app";
import * as P from "../popup";
import * as O from ".";
import {IconLabel} from "../ui/icons";

export function useOrphanListProps(
  app: A.App,
  updateApp: (f: (app: A.App) => A.App) => void,
): Parameters<typeof OrphanList>[0] {
  return {
    view: O.view(app.state, app.orphans),

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
            icon: "insert",
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
  view: O.OrphansView;
  onDestroy(thing: string): void;
  onVisit(thing: string): void;
  onAddParent(thing: string): void;
}) {
  if (props.view.items.length === 0)
    return (
      <div className="inbox empty">
        If you have any items that are not accessible from the root item, they will be listed here.
      </div>
    );

  return (
    <div className="inbox">
      {props.view.items.map((orphan) => (
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
              <IconLabel icon="jump">Jump</IconLabel>
            </button>
            <button onClick={() => props.onAddParent(orphan.thing)}>
              <IconLabel icon="insertParent">Connect</IconLabel>
            </button>
            <button onClick={() => props.onDestroy(orphan.thing)}>
              <IconLabel icon="destroy">Destroy</IconLabel>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
