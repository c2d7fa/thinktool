import * as React from "react";
import {Editor, EditorState, ContentState, getDefaultKeyBinding, getVisibleSelectionRect, SelectionState} from "draft-js";
import * as draft from "draft-js";

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
  const selection = window.getSelection();
  if (selection == undefined) return false;

  const range = selection.getRangeAt(0);
  const rect = getVisibleSelectionRect(window);

  const testRange = document.createRange();
  testRange.setStart(range.startContainer, 0);
  testRange.collapse();
  selection.removeAllRanges();
  selection.addRange(testRange);

  const testRect = getVisibleSelectionRect(window);

  selection.removeAllRanges();
  selection.addRange(range);

  return rect.top === testRect.top;
}

function currentSelectionIsOnLastLineOfSelectedElement(): boolean {
  const selection = window.getSelection();
  if (selection == undefined) return false;

  const range = selection.getRangeAt(0);
  const rect = getVisibleSelectionRect(window);

  const testRange = document.createRange();
  testRange.setStart(range.startContainer, (range.startContainer as Text).length);
  testRange.collapse();
  selection.removeAllRanges();
  selection.addRange(testRange);

  const testRect = getVisibleSelectionRect(window);

  selection.removeAllRanges();
  selection.addRange(range);

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

function linkStrategy(block: draft.ContentBlock, callback: (start: number, end: number) => void, contentState: ContentState): void {
  const linkRegex = /https?:\/\S*/g;
  for (const match of block.getText().matchAll(linkRegex) ?? []) {
    if (match.index === undefined) {
      console.warn("I didn't think this could happen.");
      return;
    }

    const start = match.index;
    let end = match.index + match[0].length;

    // Trim punctuation at the end of link:
    if ([",", ".", ":", ")", "]"].includes(block.getText()[end - 1])) {
      end -= 1;
    }

    callback(start, end);
  }
}

function Link(props: {contentState: draft.ContentState; blockKey: string; start: number; end: number; children: React.ReactNode[]}) {
  const url = props.contentState.getBlockForKey(props.blockKey).getText().slice(props.start, props.end);

  // For reasons that I do not understand (even though I have spent the last 45
  // minutes trying to figure it out), the link cannot be clicked and
  // essentially behaves exactly like text (except you can right-click it). So
  // we use these properties to make the link behave like an actual link. This
  // is obviously less-than-ideal.
  //
  // Let's just pretend that this is intentional behavior by only triggering the
  // link on middle click. That way the user can easily edit the text, I guess.
  //
  // Note that this is pretty broken on mobile, although if the user really
  // wants they can open links, it's just annoying to use.
  const workaroundProps = {
    onAuxClick: (ev) => {
      if (ev.button === 1) { // Middle click
        window.open(url);
        ev.preventDefault();
      }
    },
    title: `${url}\n(Open with middle click)`,
  };

  return <a {...workaroundProps} className="plain-text-link" href={url}>{props.children}</a>;
}

const decorator = new draft.CompositeDecorator([
  {strategy: linkStrategy, component: Link},
]);

export const PlainText = React.forwardRef(function PlainText(props: {text: string; setText(text: string): void; className?: string; onFocus?(ev: React.FocusEvent<{}>): void; onKeyDown?(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean; placeholder?: string}, ref?: React.Ref<{focus(): void}>) {
  const ref_: React.MutableRefObject<{focus(): void}> = React.useRef({focus: () => {}});
  if (ref === undefined || ref === null)
    ref = ref_;

  const [editorState, setEditorState] = React.useState(EditorState.createWithContent(ContentState.createFromText(props.text), decorator));

  // TODO: There is almost certainly a better way to do this.

  React.useEffect(() => {
    if (props.text !== editorState.getCurrentContent().getPlainText()) {
      setEditorState(EditorState.createWithContent(ContentState.createFromText(props.text), decorator));
    }
  }, [props.text]);

  function onChange(newEditorState: EditorState): void {
    setEditorState(newEditorState);
    const newText = newEditorState.getCurrentContent().getPlainText();
    if (newText !== props.text)
      props.setText(newText);
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

    const startOfItem = firstBlockSelected(editorState) && editorState.getSelection().getFocusOffset() === 0;
    const endOfItem = lastBlockSelected(editorState) && editorState.getSelection().getFocusOffset() === editorState.getCurrentContent().getBlockForKey(editorState.getSelection().getFocusKey()).getLength();

    if (props.onKeyDown !== undefined && props.onKeyDown(ev, {startOfItem, endOfItem})) {
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
      placeholder={props.placeholder}
      editorState={editorState}
      onChange={onChange}
      stripPastedStyles={true}
      keyBindingFn={keyBindingFn}
      onFocus={(ev: React.FocusEvent<{}>) => { props.onFocus !== undefined && props.onFocus(ev) }}
      onBlur={resetSelection}/>
  </span>;
});
