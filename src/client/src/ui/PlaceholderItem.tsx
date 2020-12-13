import * as React from "react";

import * as C from "../context";
import * as T from "../tree";

import Bullet from "./Bullet";

export function isVisible(app: C.AppState): boolean {
  return T.children(app.tree, T.root(app.tree)).length === 0;
}

export function create(app: C.AppState): C.AppState {
  let [state, tree, _, id] = T.createChild(app.state, app.tree, T.root(app.tree));
  tree = T.focus(tree, id);
  return C.merge(app, {state, tree});
}

export function PlaceholderItem(props: {onCreate(): void}) {
  function onFocus(ev: React.FocusEvent<HTMLDivElement>): void {
    ev.stopPropagation();
    ev.preventDefault();
    props.onCreate();
  }

  return (
    <li className="subtree-container">
      <div className="item">
        <Bullet
          beginDrag={() => {
            return;
          }}
          status="terminal"
          toggle={() => {
            return;
          }}
        />
        <div className="editor content placeholder-child" onFocus={onFocus} tabIndex={0}>
          New Item
        </div>
      </div>
    </li>
  );
}
