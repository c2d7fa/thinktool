import * as React from "react";
import * as ReactDOM from "react-dom";
import {choose} from "@johv/miscjs";

import * as P from ".";

import {Result} from "@thinktool/search";

import {App, merge} from "../app";

function useFocusInputRef(): React.RefObject<HTMLInputElement> {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return inputRef;
}

function ResultListItem(props: {result: Result; selected: boolean; onSelect: () => void}) {
  // Using onPointerDown instead of onClick to circumvent parent getting blur
  // event before we get our events.
  return (
    <li
      onPointerDown={props.onSelect}
      className={`link-autocomplete-popup-result${props.selected ? " selected-result" : ""}`}
    >
      <span className="link-autocomplete-popup-result-content">
        {props.result.content} <span className="link-autocomplete-popup-id">{props.result.thing}</span>
      </span>
    </li>
  );
}

function Popup(props: {
  query: string;
  setQuery(query: string): void;

  loadMoreResults(): void;
  results: Result[];

  selectActive(): void;
  selectThing(thing: string): void;
  selectNewItem(): void;
  abort(): void;

  isNewItemActive: boolean;
  isThingActive(thing: string): boolean;
  up(): void;
  down(): void;
}) {
  // This element should always be focused when it exists. We expect the parent
  // to remove us from the DOM when we're not needed.
  const inputRef = useFocusInputRef();

  function onScroll(ev: React.UIEvent) {
    const el = ev.target as HTMLUListElement;
    if (el.scrollTop + el.clientHeight + 500 > el.scrollHeight) {
      props.loadMoreResults();
    }
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>): void {
    const {found} = choose(ev.key, {
      Enter: props.selectActive,
      Escape: props.abort,
      ArrowDown: props.down,
      ArrowUp: props.up,
    });
    if (found) ev.preventDefault();
  }

  return ReactDOM.createPortal(
    <div className="link-autocomplete-popup">
      <input
        onPointerDown={props.selectNewItem}
        className={props.isNewItemActive ? " selected-result" : ""}
        ref={inputRef}
        type="text"
        value={props.query}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
          props.setQuery(ev.target.value);
        }}
        onBlur={props.abort}
        onKeyDown={onKeyDown}
      />
      <span className="create-label">Create new item</span>
      {props.query !== "" && (
        <ul className="link-autocomplete-popup-results" onScroll={onScroll}>
          {props.results.map((result) => (
            <ResultListItem
              key={result.thing}
              selected={props.isThingActive(result.thing)}
              result={result}
              onSelect={() => props.selectThing(result.thing)}
            />
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}

export function usePopup(app: App, updateApp: (f: (app: App) => App) => void) {
  function updateState(f: (state: P.State) => P.State): void {
    updateApp((app) => merge(app, {popup: f(app.popup)}));
  }

  const component = (() => {
    if (!P.isOpen(app.popup)) return null;

    return (
      <Popup
        query={P.query(app.popup)}
        setQuery={(query) => updateState((state) => P.search(state, query))}
        results={P.results(app.popup)}
        loadMoreResults={() => {}}
        selectActive={() => updateApp((app) => P.selectActive(app))}
        selectThing={(thing) => updateApp((app) => P.selectThing(app, thing))}
        selectNewItem={() => updateApp((app) => P.selectThing(app, null))}
        abort={() => updateState(P.close)}
        isNewItemActive={P.isThingActive(app.popup, null)}
        isThingActive={(thing) => P.isThingActive(app.popup, thing)}
        up={() => updateState(P.activatePrevious)}
        down={() => updateState(P.activateNext)}
      />
    );
  })();

  return component;
}
