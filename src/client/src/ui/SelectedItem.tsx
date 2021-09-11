import * as React from "react";

import * as T from "../tree";
import * as A from "../app";
import * as E from "../editing";
import * as Editor from "./Editor";

export function isFolded(app: A.App) {
  let isFolded = false;

  for (const child of T.children(app.tree, T.root(app.tree))) {
    if (!T.expanded(app.tree, child)) {
      isFolded = true;
      break;
    }
  }

  return isFolded;
}

export const SelectedItem = React.memo(function SelectedItem(props: {
  editor: E.Editor;
  hasFocus: boolean;
  onEditEvent(event: Editor.Event): void;
  isFolded: boolean;
  unfold(): void;
}) {
  return (
    <div className="root">
      <button className="unfold-root" onClick={props.unfold} disabled={!props.isFolded}>
        <span className="fas fa-fw fa-stream" />
      </button>
      <Editor.Editor editor={props.editor} hasFocus={props.hasFocus} onEvent={props.onEditEvent} />
    </div>
  );
});
