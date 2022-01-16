import * as React from "react";

import Bullet from "../ui/Bullet";
import {OtherParents} from "../ui/OtherParents";

import * as O from ".";
import {IconLabel} from "../ui/icons";

export function OrphanList(props: {view: O.OrphansView; send(event: O.OrphansEvent): void}) {
  if (props.view.items.length === 0)
    return (
      <div className="inbox empty">
        If you have any items that are not accessible from the root item, they will be listed here.
      </div>
    );

  const onJump = React.useCallback(
    (item: O.OrphanListItem) => {
      props.send({type: "jump", thing: item.thing});
    },
    [props.send],
  );

  const onAddParent = React.useCallback(
    (item: O.OrphanListItem) => {
      props.send({type: "addParent", thing: item.thing});
    },
    [props.send],
  );

  const onDestroy = React.useCallback(
    (item: O.OrphanListItem) => {
      props.send({type: "destroy", thing: item.thing});
    },
    [props.send],
  );

  return (
    <div className="inbox">
      {props.view.items.map((orphan) => (
        <div className="inbox-card">
          <div className="card-item">
            <OtherParents
              otherParents={orphan.parents}
              click={() => onJump(orphan)}
              altClick={() => onJump(orphan)}
            />
            <Bullet
              status={orphan.hasChildren ? "collapsed" : "terminal"}
              beginDrag={() => {}}
              toggle={() => onJump(orphan)}
              onMiddleClick={() => onJump(orphan)}
            />
            <span className="title">{orphan.title}</span>
          </div>
          <div className="buttons">
            <button onClick={() => onJump(orphan)}>
              <IconLabel icon="jump">Jump</IconLabel>
            </button>
            <button onClick={() => onAddParent(orphan)}>
              <IconLabel icon="insertParent">Connect</IconLabel>
            </button>
            <button onClick={() => onDestroy(orphan)}>
              <IconLabel icon="destroy">Destroy</IconLabel>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
