import * as React from "react";

const Style = require("./style.module.scss").default;

import {classes, choose} from "@johv/miscjs";

import * as A from "../app";
import * as Sh from "../shortcuts";
import * as Ac from "../actions";
import * as P from "../popup";

import {OtherParents} from "../ui/OtherParents";
import {StaticContent} from "../ui/editor";
import Bullet from "../ui/Bullet";
import {ItemLayout} from "../ui/item";
import {Icon} from "../ui/icons";

const Result = React.memo(
  function (props: {result: (P.View & {open: true})["results"][number]; onSelect(): void}) {
    // Using onPointerDown instead of onClick to circumvent parent getting blur
    // event before we get our events.
    return (
      <div
        className={classes({[Style.result]: true, [Style.selected]: props.result.isSelected})}
        onPointerDown={(ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          props.onSelect();
        }}
      >
        <ItemLayout
          otherParents={
            <OtherParents otherParents={props.result.otherParents} click={() => {}} altClick={() => {}} />
          }
          bullet={
            <Bullet beginDrag={() => {}} status={props.result.status} toggle={() => {}} onMiddleClick={() => {}} />
          }
          editor={<StaticContent content={props.result.content} />}
        />
      </div>
    );
  },
  (prev, next) => JSON.stringify(prev.result) === JSON.stringify(next.result),
);

export function useSearchBarProps(
  app: A.App,
  updateApp: A.UpdateApp,
  send: (event: A.Event) => void,
  search: (query: string) => void,
): Parameters<typeof SearchBar>[0] {
  function updatePopup(f: (state: P.State) => P.State): void {
    updateApp((app) => A.merge(app, {popup: f(app.popup)}));
  }

  const icon = A.view(app).popup.icon;
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
    description,
    popup: A.view(app).popup,
    onActivate: () => send({type: "action", action}),
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
  popup: P.View;

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
    if (inputRef.current !== null && props.popup.open) {
      inputRef.current.focus();
    }
  }, [inputRef, props.popup.open]);

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
        [Style["showresults"]]: (props.popup.open && props.popup.results.length) > 0,
        [Style["new-item-selected"]]: props.popup.open && props.popup.isQuerySelected,
      })}
      onPointerDown={(ev) => {
        ev.preventDefault();
        props.onActivate();
      }}
    >
      <span className={Style.icon}>
        <Icon
          icon={
            props.popup.icon === "search"
              ? "find"
              : props.popup.icon === "insert"
              ? "insertSibling"
              : props.popup.icon === "link"
              ? "insertLink"
              : "find"
          }
        />
      </span>
      {props.popup.open ? (
        <input
          ref={inputRef}
          value={props.popup.query}
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
        {props.popup.open &&
          props.popup.results.map((result) => (
            <Result key={result.thing} result={result} onSelect={() => props.onSelect(result.thing)} />
          ))}
      </div>
    </div>
  );
}
