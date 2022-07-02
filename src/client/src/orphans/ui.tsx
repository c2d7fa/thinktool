import * as React from "react";

import * as A from "../app";

import * as O from ".";
import {IconLabel} from "../ui/icons";
import {Item, SubtreeLayout} from "../ui/item";

export function OrphanList(props: {view: O.OrphansView; send: A.Send}) {
  if (props.view.items.length === 0)
    return (
      <div className="inbox empty">
        If you have any items that are not accessible from the root item, they will be listed here.
      </div>
    );

  return (
    <div className="inbox">
      {props.view.items.map((orphan) => (
        <div className="inbox-card" key={orphan.id}>
          <div className="card-item">
            <SubtreeLayout>
              <Item item={orphan} send={props.send} />
            </SubtreeLayout>
          </div>
          <div className="buttons">
            <button onClick={() => props.send({type: "orphans", event: {type: "jump", id: orphan.id}})}>
              <IconLabel icon="jump">Jump</IconLabel>
            </button>
            <button onClick={() => props.send({type: "orphans", event: {type: "addParent", id: orphan.id}})}>
              <IconLabel icon="insertParent">Connect</IconLabel>
            </button>
            <button onClick={() => props.send({type: "orphans", event: {type: "destroy", id: orphan.id}})}>
              <IconLabel icon="destroy">Destroy</IconLabel>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
