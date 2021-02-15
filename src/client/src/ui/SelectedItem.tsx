import * as React from "react";

import * as E from "../editing";
import * as Editor from "./Editor";

export function SelectedItem(props: {editor: E.Editor, hasFocus: boolean, onEditEvent(event: Editor.Event): void}) {
  return <Editor.Editor editor={editor}
}
