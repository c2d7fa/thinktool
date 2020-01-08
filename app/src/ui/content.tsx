import * as React from "react";
import * as ReactDOM from "react-dom";

export const PlainText = React.forwardRef((props: {text: string, setText(text: string): void, className?: string, onFocus?(ev: React.FocusEvent<HTMLElement>): void, onKeyDown?(ev: React.KeyboardEvent<HTMLElement>): void}, ref?: React.MutableRefObject<HTMLElement>) => {
    if (ref === undefined || ref === null)
        ref = React.useRef()

    React.useEffect(() => {
        ref.current.textContent = props.text
    }, [props.text])

    function onInput(ev): void {
        props.setText(ev.target.textContent)
    }

    return <span ref={ref} className={`content-editable-plain-text ${props.className}`} contentEditable onInput={onInput} onFocus={props.onFocus} onKeyDown={props.onKeyDown}/>
})
