import * as React from "react";
import {Editor, EditorState, ContentState, getDefaultKeyBinding, getVisibleSelectionRect, SelectionState} from "draft-js";

// TODO: The entire implementation of this is an absolute hack. The problem is
// that we want to handle ArrowUp and ArrowDown events differently depending on
// whether the user's selection is on the first or last line of the item. But it
// isn't enough to look at the text content, since an item without any newlines
// may be wrapped visually.

function firstBlockSelected(editorState: EditorState): boolean {
  return editorState.getCurrentContent().getKeyBefore(editorState.getSelection().getFocusKey()) == null;
}

function lastBlockSelected(editorState: EditorState): boolean {
  return editorState.getCurrentContent().getKeyAfter(editorState.getSelection().getFocusKey()) == null;
}

function currentSelectionIsOnFirstLineOfSelectedElement(): boolean {
  const range = window.getSelection().getRangeAt(0);
  const rect = getVisibleSelectionRect(window);

  const testRange = document.createRange();
  testRange.setStart(range.startContainer, 0);
  testRange.collapse();
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(testRange);

  const testRect = getVisibleSelectionRect(window);

  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  return rect.top === testRect.top;
}

function currentSelectionIsOnLastLineOfSelectedElement(): boolean {
  const range = window.getSelection().getRangeAt(0);
  const rect = getVisibleSelectionRect(window);

  const testRange = document.createRange();
  testRange.setStart(range.startContainer, (range.startContainer as Text).length);
  testRange.collapse();
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(testRange);

  const testRect = getVisibleSelectionRect(window);

  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  return rect.top === testRect.top;
}

function firstLineInBlockSelected(editorState: EditorState): boolean {
  const block = editorState.getCurrentContent().getBlockForKey(editorState.getSelection().getFocusKey());
  return (
    (block.getText().indexOf("\n") === -1 ||  // Block is one line
      block.getText().indexOf("\n") >= editorState.getSelection().getFocusOffset()) && // Focus is before first newline
    currentSelectionIsOnFirstLineOfSelectedElement()
  );
}

function lastLineInBlockSelected(editorState: EditorState): boolean {
  const block = editorState.getCurrentContent().getBlockForKey(editorState.getSelection().getFocusKey());
  return (
    (block.getText().lastIndexOf("\n") === -1 || // Block is one line
      block.getText().lastIndexOf("\n") <= editorState.getSelection().getFocusOffset()) && // Focus is after last newline
    currentSelectionIsOnLastLineOfSelectedElement()
  );
}

export const PlainText = React.forwardRef(function PlainText(props: {text: string; setText(text: string): void; className?: string; onFocus?(ev: React.FocusEvent<{}>): void; onKeyDown?(ev: React.KeyboardEvent<{}>): boolean}, ref?: React.RefObject<{focus(): void}>) {
  const ref_ = React.useRef();
  if (ref === undefined || ref === null)
    ref = ref_;

  const [editorState, setEditorState] = React.useState(EditorState.createWithContent(ContentState.createFromText(props.text)));

  // TODO: There is almost certainly a better way to do this.

  React.useEffect(() => {
    if (props.text !== editorState.getCurrentContent().getPlainText()) {
      setEditorState(EditorState.createWithContent(ContentState.createFromText(props.text)));
    }
  }, [props.text]);

  function onChange(newEditorState: EditorState): void {
    setEditorState(newEditorState);
    props.setText(newEditorState.getCurrentContent().getPlainText());
  }

  function keyBindingFn(ev: React.KeyboardEvent<{}>) {
    if (ev.key === "ArrowUp" && !(ev.ctrlKey || ev.altKey) && !(firstBlockSelected(editorState) && firstLineInBlockSelected(editorState))) {
      // Arrow up without modifiers inside text. Use normal action.
      return getDefaultKeyBinding(ev);
    }
    if (ev.key === "ArrowDown" && !(ev.ctrlKey || ev.altKey) && !(lastBlockSelected(editorState) && lastLineInBlockSelected(editorState))) {
      // Arrow down without modifiers inside text. Use normal action.
      return getDefaultKeyBinding(ev);
    }

    if (props.onKeyDown(ev)) {
      return null;
    } else {
      return getDefaultKeyBinding(ev);
    }
  }

  function resetSelection(): void {
    // TODO: Hack. If we do this immediately, the change is not reflected for some reason.
    setTimeout(() => {
      const newState = EditorState.acceptSelection(editorState, SelectionState.createEmpty(editorState.getCurrentContent().getFirstBlock().getKey()));
      setEditorState(newState);
    }, 20);
  }

  return <span className={`content-editable-plain-text ${props.className}`}>
    <Editor
      ref={ref as React.RefObject<Editor>}
      editorState={editorState}
      onChange={onChange}
      stripPastedStyles={true}
      keyBindingFn={keyBindingFn}
      onFocus={props.onFocus}
      onBlur={resetSelection}/>
  </span>;
});
