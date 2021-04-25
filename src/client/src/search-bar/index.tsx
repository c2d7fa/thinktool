import * as React from "react";

const Style = require("./style.module.scss").default;

import {classes, choose} from "@johv/miscjs";

import * as A from "../app";
import * as Sh from "../shortcuts";
import * as Ac from "../actions";
import * as P from "../popup";
import * as E from "../editing";
import * as M from "../messages";

import {OtherParents} from "../ui/OtherParents";
import {StaticContent} from "../ui/Editor";
import Bullet from "../ui/Bullet";

const Result = React.memo(
  function (props: {result: P.Result; isSelected: boolean}) {
    return (
      <div className={classes({[Style.result]: true, [Style.selected]: props.isSelected})}>
        <OtherParents otherParents={props.result.parents} click={() => {}} altClick={() => {}} />
        <Bullet
          beginDrag={() => {}}
          status={props.result.hasChildren ? "collapsed" : "terminal"}
          toggle={() => {}}
          onMiddleClick={() => {}}
        />
        <StaticContent content={props.result.content} />
      </div>
    );
  },
  (prev, next) => prev.result.thing === next.result.thing && prev.isSelected === next.isSelected,
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

  const [action, description] = (() => {
    const editor = A.focusedEditor(app);
    if (editor === null) {
      return ["find", "search"] as ["find", string];
    } else if (E.isEmpty(editor)) {
      return ["replace", "connect an existing item"] as ["replace", string];
    } else {
      return ["insert-link", "insert a link"] as ["insert-link", string];
    }
  })();

  return {
    shortcut: Sh.format(Ac.shortcut(action)),
    icon: action === "find" ? "search" : action === "insert-link" ? "link" : "plus-circle",
    action: description,
    isSearching: P.isOpen(app.popup),
    results: P.isOpen(app.popup) ? P.results(app.popup) : [],
    isThingActive: (thing) => P.isThingActive(app.popup, thing),
    onActivate: () => send("action", {action}),
    query: P.isOpen(app.popup) ? P.query(app.popup) : "",
    onQuery(query: string) {
      updatePopup((popup) => P.setQuery(popup, query));
      search(query);
    },
    onAbort() {
      updatePopup(P.close);
    },
    onUp: () => updatePopup((popup) => P.activatePrevious(popup)),
    onDown: () => updatePopup((popup) => P.activateNext(popup)),
  };
}

export function SearchBar(props: {
  shortcut: string;
  action: string;
  icon: "search" | "link" | "plus-circle";
  isSearching: boolean;
  query: string;
  results: P.Result[];
  isThingActive(thing: string): boolean;

  onActivate(): void;
  onAbort(): void;
  onQuery(query: string): void;
  onUp(): void;
  onDown(): void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current !== null && props.isSearching) {
      inputRef.current.focus();
    }
  }, [inputRef, props.isSearching]);

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>): void {
    const {found} = choose(ev.key, {
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
        [Style["connect"]]: props.icon === "plus-circle",
        [Style["showresults"]]: props.isSearching && props.results.length > 0,
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
          onInput={(ev) => props.onQuery((ev.target as HTMLInputElement).value)}
          onBlur={props.onAbort}
          onKeyDown={onKeyDown}
        />
      ) : (
        <span className={Style.placeholder}>
          Press <kbd>{props.shortcut}</kbd> to {props.action}.
        </span>
      )}
      <div className={Style.results}>
        {props.results.map((result) => (
          <Result key={result.thing} result={result} isSelected={props.isThingActive(result.thing)} />
        ))}
      </div>
    </div>
  );
}
