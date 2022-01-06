import * as React from "react";

const Style = require("./style.module.scss").default;

import {classes, choose} from "@johv/miscjs";

import * as A from "../app";
import * as Sh from "../shortcuts";
import * as Ac from "../actions";
import * as P from "../popup";
import * as M from "../messages";

import {OtherParents} from "../ui/OtherParents";
import {StaticContent} from "../ui/editor";
import Bullet from "../ui/Bullet";
import {ItemLayout} from "../ui/item";

const Result = React.memo(
  function (props: {result: P.Result; isSelected: boolean; onSelect(): void}) {
    // Using onPointerDown instead of onClick to circumvent parent getting blur
    // event before we get our events.
    return (
      <div
        className={classes({[Style.result]: true, [Style.selected]: props.isSelected})}
        onPointerDown={(ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          props.onSelect();
        }}
      >
        <ItemLayout
          otherParents={<OtherParents otherParents={props.result.parents} click={() => {}} altClick={() => {}} />}
          bullet={
            <Bullet
              beginDrag={() => {}}
              status={props.result.hasChildren ? "collapsed" : "terminal"}
              toggle={() => {}}
              onMiddleClick={() => {}}
            />
          }
          editor={<StaticContent content={props.result.content} />}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.result.thing === next.result.thing &&
    prev.isSelected === next.isSelected &&
    prev.onSelect === next.onSelect,
);

export function useSearchBarProps(
  app: A.App,
  updateApp: A.UpdateApp,
  send: M.Send,
  search: (query: string) => void,
): Parameters<typeof SearchBar>[0] {
  function updatePopup(f: (state: P.State) => P.State): void {
    updateApp((app) => A.merge(app, {popup: f(app.popup)}));
  }

  const icon = P.icon(app);
  const action = icon === "search" ? "find" : icon === "insert" ? "replace" : "insert-link";
  const description =
    icon === "search"
      ? "search"
      : icon === "insert"
      ? "connect an existing item"
      : icon === "link"
      ? "insert a link"
      : "";

  return {
    shortcut: Sh.format(Ac.shortcut(action)),
    icon,
    description,
    isSearching: P.isOpen(app.popup),
    results: P.isOpen(app.popup) ? P.results(app.popup) : [],
    isThingActive: (thing) => P.isThingActive(app.popup, thing),
    onActivate: () => send("action", {action}),
    query: P.isOpen(app.popup) ? P.query(app.popup) : "",
    isNewItemActive: P.isOpen(app.popup) && P.isThingActive(app.popup, null),
    onQuery(query: string) {
      updatePopup((popup) => P.setQuery(popup, query));
      search(query);
    },
    onAbort() {
      updatePopup(P.close);
    },
    onUp: () => updatePopup((popup) => P.activatePrevious(popup)),
    onDown: () => updatePopup((popup) => P.activateNext(popup)),
    onSelect: (thing) => updateApp((app) => P.selectThing(app, thing)),
    onSelectActive: () => updateApp((app) => P.selectActive(app)),
  };
}

export function SearchBar(props: {
  shortcut: string;
  description: string;
  icon: "search" | "link" | "insert";
  isSearching: boolean;
  query: string;
  results: P.Result[];
  isThingActive(thing: string): boolean;
  isNewItemActive: boolean;

  onActivate(): void;
  onAbort(): void;
  onQuery(query: string): void;
  onUp(): void;
  onDown(): void;
  onSelect(thing: string): void;
  onSelectActive(): void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current !== null && props.isSearching) {
      inputRef.current.focus();
    }
  }, [inputRef, props.isSearching]);

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>): void {
    const {found} = choose(ev.key, {
      Enter: props.onSelectActive,
      Escape: props.onAbort,
      ArrowDown: props.onDown,
      ArrowUp: props.onUp,
    });
    if (found) ev.preventDefault();
  }

  return (
    <div
      className={classes({
        [Style["search-bar"]]: true,
        [Style["find"]]: props.icon === "search",
        [Style["link"]]: props.icon === "link",
        [Style["connect"]]: props.icon === "insert",
        [Style["showresults"]]: props.isSearching && props.results.length > 0,
        [Style["new-item-selected"]]: props.isNewItemActive,
      })}
      onPointerDown={(ev) => {
        ev.preventDefault();
        props.onActivate();
      }}
    >
      {/* We use FA, which apparently doesn't handle replacements very well, so we use this hack; see the CSS. */}
      <span className={`icon fa-fw fas fa-search`} />
      <span className={`icon fa-fw fas fa-link`} />
      <span className={`icon fa-fw fas fa-plus-circle`} />
      {props.isSearching ? (
        <input
          ref={inputRef}
          value={props.query}
          onChange={(ev) => props.onQuery((ev.target as HTMLInputElement).value)}
          onBlur={props.onAbort}
          onKeyDown={onKeyDown}
          onPointerDown={(ev) => {
            // Clicks should just reposition the cursor in the input field.
            ev.stopPropagation();
          }}
        />
      ) : (
        <span className={Style.placeholder}>
          Press <kbd>{props.shortcut}</kbd> to {props.description}.
        </span>
      )}
      <div className={Style.results}>
        {props.results.map((result) => (
          <Result
            key={result.thing}
            result={result}
            isSelected={props.isThingActive(result.thing)}
            onSelect={() => props.onSelect(result.thing)}
          />
        ))}
      </div>
    </div>
  );
}
