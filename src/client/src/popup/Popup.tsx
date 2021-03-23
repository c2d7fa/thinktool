import * as React from "react";
import * as ReactDOM from "react-dom";
import {choose} from "@johv/miscjs";

import * as P from ".";

import type {Result} from "../search";

import {App, merge} from "../app";

import * as D from "../data";
import {usePropRef} from "../react-utils";

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
  results: {id: number; thing: string; content: string; isActive: boolean}[];

  selectActive(): void;
  selectId(id: number): void;
  selectNewItem(): void;
  abort(): void;

  isNewItemActive: boolean;
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
      ArrowDown: props.up,
      ArrowUp: props.down,
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
              selected={result.isActive}
              result={result}
              onSelect={() => props.selectId(result.id)}
            />
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}

export function usePopup(app: App) {
  const [state, setState] = React.useState<P.State>(P.initial);

  const appRef = usePropRef(app);

  function input(seedText?: string): Promise<[App, string]> {
    return new Promise((resolve, reject) => {
      setState((state) =>
        P.open(state, {
          query: seedText ?? "",
          select(selection) {
            if ("thing" in selection) {
              resolve([appRef.current!, selection.thing]);
            } else {
              let [state, newItem] = D.create(appRef.current!.state);
              state = D.setContent(state, newItem, [selection.content]);
              resolve([merge(appRef.current!, {state}), newItem]);
            }
          },
        }),
      );
    });
  }

  const component = (() => {
    if (!P.isOpen(state)) return null;

    return (
      <Popup
        query={P.query(state)}
        setQuery={() => {}}
        results={[]}
        loadMoreResults={() => {}}
        selectActive={() => {}}
        selectId={() => {}}
        selectNewItem={() => {}}
        abort={() => setState(P.close)}
        isNewItemActive={false}
        up={() => {}}
        down={() => {}}
      />
    );
  })();

  return {component, input};
}
