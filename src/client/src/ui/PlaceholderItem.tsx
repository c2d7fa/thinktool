import * as React from "react";

import {App, merge, update} from "../app";
import Bullet from "./Bullet";

import * as T from "../tree";
import {ItemLayout} from "./item";

export function isVisible(app: App): boolean {
  return T.children(app.tree, T.root(app.tree)).length === 0;
}

export function create(app: App): App {
  let [state, tree, _, node] = T.createChild(app.state, app.tree, T.root(app.tree));
  return update(merge(app, {state, tree}), {type: "focus", id: node.id});
}

export function PlaceholderItem(props: {onCreate(): void}) {
  function onFocus(ev: React.FocusEvent<HTMLDivElement>): void {
    ev.stopPropagation();
    ev.preventDefault();
    props.onCreate();
  }

  return (
    <ItemLayout
      bullet={
        <Bullet
          beginDrag={() => {
            return;
          }}
          status="terminal"
          toggle={() => {
            return;
          }}
        />
      }
      otherParents={null}
      editor={
        <div className="editor content placeholder-child" onFocus={onFocus} tabIndex={0}>
          New Item
        </div>
      }
    />
  );
}
