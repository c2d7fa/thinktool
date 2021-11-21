import * as React from "react";

const style = require("./icons.module.scss").default;

type IconId = "home" | "find" | "jump" | "unfold" | "reddit";
const knownIds = ["home", "find", "jump", "unfold", "reddit"];

function fontAwesomeId(id: IconId): string {
  return {
    home: "home",
    find: "search",
    jump: "hand-point-right",
    unfold: "stream",
    reddit: "reddit-alien",
  }[id];
}

function isKnownId(id: string): id is IconId {
  return knownIds.includes(id);
}

export function IconLabel(props: {icon: IconId | string; children: React.ReactNode}) {
  const fas = isKnownId(props.icon) && fontAwesomeId(props.icon) === "reddit-alien" ? "fab" : "fas";
  const id = isKnownId(props.icon) ? fontAwesomeId(props.icon) : props.icon;
  return (
    <span className={style.iconLabel}>
      <i className={`${fas} fa-fw fa-${id}`} aria-hidden="true" />
      {props.children}
    </span>
  );
}
