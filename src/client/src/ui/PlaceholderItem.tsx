import * as React from "react";

import {App, merge} from "../app";
import Bullet from "./Bullet";

import * as T from "../tree";

export function isVisible(app: App): boolean {
  return T.children(app.tree, T.root(app.tree)).length === 0;
}

export function create(app: App): App {
  let [state, tree, _, id] = T.createChild(app.state, app.tree, T.root(app.tree));
  tree = T.focus(tree, id);
  return merge(app, {state, tree});
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
