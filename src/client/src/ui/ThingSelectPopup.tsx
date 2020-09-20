import * as React from "react";
import * as ReactDOM from "react-dom";

import * as D from "../data";
import Search from "../search";

function search(state: D.State, text: string, maxResults: number): [string, string][] {
  // [TODO] Obviously we want some kind of caching for search. At the very
  // least, we shouldn't regenerate the entire index on each key typed, but we
  // should be able to do better than that.
  const search = new Search(state);
  return search.query(text, maxResults).map((result) => [result.content, result.thing]);
}

export default function ThingSelectPopup(props: {
  state: D.State;
  hide(): void;
  submit(thing: string): void;
  create(content: string): void;
  seedText?: string;
}) {
  const [text, setText_] = React.useState("");
  const [results, setResults] = React.useState<[string, string][]>([]);
  const [maxResults, setMaxResults] = React.useState<number>(50);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
  const [automaticSelection, setAutomaticSelection] = React.useState<false | {from: number}>(false);
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
      setMaxResults(50);
      const results = search(props.state, text, 50);
      setResults(results);

      if (results.length === 0) {
        setAutomaticSelection({from: selectedIndex});
        setSelectedIndex(-1);
      } else {
        if (automaticSelection) {
          setSelectedIndex(automaticSelection.from);
          setAutomaticSelection(false);
        }
      }
    }
  }

  React.useEffect(() => {
    if (props.seedText !== undefined) setText(props.seedText);
  }, []);

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>): void {
    if (ev.key === "Enter") {
      if (selectedIndex === -1) {
        props.create(text);
      } else {
        props.submit(results[selectedIndex][1]);
      }
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

  function Result(props: {result: [string, string]; selected: boolean; submit: () => void}) {
    // Using onPointerDown instead of onClick to circumvent parent getting blur
    // event before we get our events.
    return (
      <li
        onPointerDown={props.submit}
        className={`link-autocomplete-popup-result${props.selected ? " selected-result" : ""}`}>
        <span className="link-autocomplete-popup-result-content">
          {props.result[0]} <span className="link-autocomplete-popup-id">{props.result[1]}</span>
        </span>
      </li>
    );
  }

  function onScroll(ev: React.UIEvent) {
    const el = ev.target as HTMLUListElement;
    if (el.scrollTop + el.clientHeight + 500 > el.scrollHeight) {
      setMaxResults((maxResults) => maxResults + 50);
      setResults(search(props.state, text, maxResults));
    }
  }

  return ReactDOM.createPortal(
    <div className="link-autocomplete-popup">
      <input
        onPointerDown={() => props.create(text)}
        className={selectedIndex === -1 ? " selected-result" : ""}
        ref={ref}
        type="text"
        value={text}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setText(ev.target.value)}
        onBlur={() => setTimeout(() => props.hide())}
        onKeyDown={onKeyDown}
      />
      <span className="create-label">Create new item</span>
      {text !== "" && (
        <ul className="link-autocomplete-popup-results" onScroll={onScroll}>
          {results.map((result, i) => (
            <Result
              key={result[1]}
              selected={i === selectedIndex}
              result={result}
              submit={() => props.submit(result[1])}
            />
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}
