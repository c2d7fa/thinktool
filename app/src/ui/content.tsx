import * as React from "react";
import {Editor, EditorState, ContentState, getDefaultKeyBinding} from "draft-js";

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
    if (props.onKeyDown(ev))
      return null;
    else
      return getDefaultKeyBinding(ev);
  }

  return <span className={`content-editable-plain-text ${props.className}`}>
    <Editor
      ref={ref as React.RefObject<Editor>}
      editorState={editorState}
      onChange={onChange} 
      stripPastedStyles={true}
      keyBindingFn={keyBindingFn}
      onFocus={props.onFocus}/>
  </span>;
});
