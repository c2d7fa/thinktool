import * as React from "react";
import * as MdiReact from "@mdi/react";
import * as MdiJs from "@mdi/js";

const style = require("./icons.module.scss").default;

const knownIds = ["home", "find", "jump", "unfold", "reddit", "offline"] as const;
type IconId = typeof knownIds[number];

function fontAwesomeId(id: IconId): string {
  return {
    home: "home",
    find: "search",
    jump: "hand-point-right",
    unfold: "stream",
    reddit: "reddit-alien",
    offline: "power-off",
  }[id];
}

function isKnownId(id: string): id is IconId {
  return knownIds.includes(id as IconId);
}

type MdiIconId = keyof typeof MdiJs;

function MdiIcon(props: {icon: MdiIconId}) {
  return <MdiReact.Icon path={MdiJs[props.icon]} size="1.2em" />;
}

function FontAwesomeIcon(props: {icon: IconId | string}) {
  const fas = isKnownId(props.icon) && fontAwesomeId(props.icon) === "reddit-alien" ? "fab" : "fas";
  const id = isKnownId(props.icon) ? fontAwesomeId(props.icon) : props.icon;
  return <i className={`${fas} fa-fw fa-${id}`} aria-hidden="true" />;
}

export function Icon(props: {icon: keyof typeof MdiJs | IconId | string}) {
  if (props.icon in MdiJs) {
    return <MdiIcon icon={props.icon as keyof typeof MdiJs} />;
  } else {
    return <FontAwesomeIcon icon={props.icon} />;
  }
}

export function IconLabel(props: {icon: keyof typeof MdiJs | IconId | string; children: React.ReactNode}) {
  return (
    <span className={style.iconLabel}>
      <Icon icon={props.icon} />
      {props.children}
    </span>
  );
}
