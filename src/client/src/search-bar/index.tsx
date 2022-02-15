import * as React from "react";

const Style = require("./style.module.scss").default;

import {classes, choose} from "@johv/miscjs";

import * as A from "../app";
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

export function SearchBar(props: {popup: P.View; send(event: A.Event): void}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current !== null && props.popup.open) {
      inputRef.current.focus();
    }
  }, [inputRef, props.popup.open]);

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>): void {
    const {found} = choose(ev.key, {
      Enter: () => props.send({topic: "popup", type: "select"}),
      Escape: () => props.send({topic: "popup", type: "close"}),
      ArrowDown: () => props.send({topic: "popup", type: "down"}),
      ArrowUp: () => props.send({topic: "popup", type: "up"}),
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
        props.send({topic: "popup", type: "action", action: props.popup.action});
      }}
    >
      <span className={Style.icon}>
        <Icon icon={props.popup.icon} />
      </span>
      {props.popup.open ? (
        <input
          ref={inputRef}
          value={props.popup.query}
          onChange={(ev) => props.send({topic: "popup", type: "query", query: ev.target.value})}
          onBlur={() => props.send({topic: "popup", type: "close"})}
          onKeyDown={onKeyDown}
          onPointerDown={(ev) => {
            // Clicks should just reposition the cursor in the input field.
            ev.stopPropagation();
          }}
        />
      ) : (
        <span className={Style.placeholder}>
          Press <kbd>{props.popup.shortcut}</kbd> to {props.popup.description}.
        </span>
      )}
      <div className={Style.results}>
        {props.popup.open &&
          props.popup.results.map((result) => (
            <Result
              key={result.thing}
              result={result}
              onSelect={() => props.send({topic: "popup", type: "pick", thing: result.thing})}
            />
          ))}
      </div>
    </div>
  );
}
