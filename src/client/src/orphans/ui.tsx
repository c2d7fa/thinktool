import * as React from "react";

import * as A from "../app";
import * as O from ".";
import {IconLabel} from "../ui/icons";
import {Item, SubtreeLayout} from "../ui/item";

export function OrphanList(props: {view: O.OrphansView; send(event: O.OrphansEvent): void}) {
  if (props.view.items.length === 0)
    return (
      <div className="inbox empty">
        If you have any items that are not accessible from the root item, they will be listed here.
      </div>
    );

  const onJump = React.useCallback(
    (item: A.Item) => {
      props.send({type: "jump", id: item.id});
    },
    [props.send],
  );

  const onAddParent = React.useCallback(
    (item: A.Item) => {
      props.send({type: "addParent", id: item.id});
    },
    [props.send],
  );

  const onDestroy = React.useCallback(
    (item: A.Item) => {
      props.send({type: "destroy", id: item.id});
    },
    [props.send],
  );

  return (
    <div className="inbox">
      {props.view.items.map((orphan) => (
        <div className="inbox-card">
          <div className="card-item">
            <SubtreeLayout>
              <Item item={orphan} onItemEvent={() => {}} />
            </SubtreeLayout>
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
