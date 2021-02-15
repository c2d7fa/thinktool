import * as React from "react";

import * as T from "../tree";
import * as A from "../app";
import * as E from "../editing";
import * as Editor from "./Editor";

export function useUnfold(app: A.App, updateApp: (f: (app: A.App) => A.App) => void) {
  let isFolded = false;
  for (const child of T.children(app.tree, T.root(app.tree))) {
    if (!T.expanded(app.tree, child)) {
      isFolded = true;
      break;
    }
  }

  const unfold = React.useCallback(() => {
    updateApp((app) => A.unfold(app, T.root(app.tree)));
  }, [updateApp]);

  return {isFolded, unfold};
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
