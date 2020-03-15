import * as React from "react";
import * as ReactDOM from "react-dom";

import * as D from "../data";

function search(state: D.Things, text: string): [string, string][] {
  return D.search(state, text).map(thing => [D.contentText(state, thing), thing]);
}

export default function ThingSelectPopup(props: {state: D.Things; hide(): void; submit(thing: string): void}) {
  const [text, setText_] = React.useState("");
  const [results, setResults] = React.useState<[string, string][]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1); // -1 means nothing selected
  const ref = React.useRef<HTMLInputElement>(null);

  // This element should always be focused when it exists. We expect the parent
  // to destroy us through the 'hide' callback.
  React.useEffect(() => {
    ref.current?.focus();
  }, []);

  function setText(text: string): void {
    setText_(text);

    if (text === "") {
      setResults([]);
    } else {
      setResults(search(props.state, text));
    }
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>): void {
    if (ev.key === "Enter") {
      props.submit(results[selectedIndex][1]);
      props.hide();
      ev.preventDefault();
    } else if (ev.key === "Escape") {
      props.hide();
      ev.preventDefault();
    } else if (ev.key === "ArrowDown") {
      setSelectedIndex(Math.min(results.length, selectedIndex + 1));
      ev.preventDefault();
    } else if (ev.key === "ArrowUp") {
      setSelectedIndex(Math.max(-1, selectedIndex - 1));
      ev.preventDefault();
    }
  }

  function Result(props: {result: [string, string]; selected: boolean}) {
    return <li className={`link-autocomplete-popup-result${props.selected ? " selected-result" : ""}`}><span className="link-autocomplete-popup-result-content">{props.result[0]} ({props.result[1]})</span></li>;
  }

  return ReactDOM.createPortal(
    <div className="link-autocomplete-popup">
      <input
        ref={ref}
        type="text"
        value={text}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setText(ev.target.value)}
        /*onBlur={props.hide}*/
        onKeyDown={onKeyDown}
      />
      { results.length !== 0 &&
        <ul className="link-autocomplete-popup-results">
          {results.map((result, i) => <Result key={result[1]} selected={i === selectedIndex} result={result}/>)}
        </ul> }
    </div>,
    document.body
  );
}
