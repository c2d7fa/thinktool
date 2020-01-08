import * as React from "react";
import * as ReactDOM from "react-dom";
import { prependOnceListener } from "cluster";

export const PlainText = React.forwardRef((props: {text: string; setText(text: string): void; className?: string; onFocus?(ev: React.FocusEvent<HTMLElement>): void; onKeyDown?(ev: React.KeyboardEvent<HTMLElement>): void}, ref?: React.MutableRefObject<HTMLElement>) => {
  if (ref === undefined || ref === null)
    ref = React.useRef();

  React.useEffect(() => {
    if (ref.current.textContent !== props.text) {
      ref.current.textContent = props.text;
    }
  }, [props.text]);

  function onInput(ev): void {
    props.setText(ev.target.textContent);
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLSpanElement>): void {
    if (ev.key === "Enter" && !(ev.shiftKey || ev.ctrlKey || ev.altKey)) {
      const selectionStart = window.getSelection().getRangeAt(0).startOffset;
      const selectionEnd = window.getSelection().getRangeAt(0).endOffset;
      const parent = window.getSelection().getRangeAt(0).endContainer.parentNode;

      const newText = props.text.slice(0, selectionStart) + "\n" + props.text.slice(selectionEnd);
      ref.current.textContent = newText;
      console.log(parent);
      window.getSelection().setPosition(parent.firstChild, selectionEnd + 1);
      props.setText(newText);

      ev.preventDefault();
    } else if (ev.key === "Enter") {
      // Don't let the browser mess up the HTML, but relay the event.
      ev.preventDefault();
      if (props.onKeyDown !== undefined)
        props.onKeyDown(ev);
    } else {
      if (props.onKeyDown !== undefined)
        props.onKeyDown(ev);
    }
  }

  return <span ref={ref} className={`content-editable-plain-text ${props.className}`} contentEditable onInput={onInput} onFocus={props.onFocus} onKeyDown={onKeyDown}/>;
});
