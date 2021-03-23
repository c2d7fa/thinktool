import * as React from "react";
import * as ReactDOM from "react-dom";
import {choose} from "@johv/miscjs";

import * as P from ".";

import type {Result} from "../search";

import {App, merge} from "../app";

import * as D from "../data";
import Search from "../search";
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

function useSearch(args: {query: string; onSearch(query: string, maxResults: number): void}) {
  const [maxResults, setMaxResults] = React.useState(50);

  function loadMoreResults() {
    const newMaxResults = maxResults + 50;
    args.onSearch(args.query, newMaxResults);
    setMaxResults(newMaxResults);
  }

  function setQuery(newQuery: string) {
    setMaxResults(50);
    args.onSearch(newQuery, 50);
  }

  return {setQuery, loadMoreResults};
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

  const [onCreate, setOnCreate] = React.useState(() => (content: string) => {
    console.error("onCreate callback not set!");
  });

  const [onSelect, setOnSelect] = React.useState(() => (selection: string) => {
    console.error("onSelect callback not set!");
  });

  function input(seedText?: string): Promise<[App, string]> {
    return new Promise((resolve, reject) => {
      setOnCreate(() => (content: string) => {
        let [state, selection] = D.create(appRef.current!.state);
        state = D.setContent(state, selection, [content]);
        resolve([merge(appRef.current!, {state}), selection]);
      });
      setOnSelect(() => (selection: string) => {
        resolve([appRef.current!, selection]);
      });
      setState((state) => P.open(state, {query: seedText ?? ""}));
    });
  }

  const search = React.useMemo<Search>(() => new Search(app.state), [app.state]);

  function onSearch(query: string, maxResults: number) {
    setState((state) =>
      P.search(
        state,
        query,
        (function results() {
          if (query === "") {
            return [];
          } else {
            // [TODO] This is slow for long text. Consider adding a debounce for long
            // text as a workaround.
            return search.query(query, maxResults);
          }
        })(),
      ),
    );
  }

  const {setQuery, loadMoreResults} = useSearch({query: P.query(state), onSearch});

  React.useEffect(() => {
    if (!P.isOpen(state)) {
      onSearch("", 50);
    }
  }, [state]);

  const component = (() => {
    if (!P.isOpen(state)) return null;

    return (
      <Popup
        query={P.query(state)}
        setQuery={setQuery}
        results={[]}
        loadMoreResults={loadMoreResults}
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
