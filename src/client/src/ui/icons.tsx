import * as React from "react";
import * as MdiReact from "@mdi/react";
import * as MdiJs from "@mdi/js";

const style = require("./icons.module.scss").default;

const faIcons = {
  offline: "power-off",
};

const mdiIcons = {
  home: MdiJs.mdiHomeOutline,
  find: MdiJs.mdiMagnify,
  jump: MdiJs.mdiArrowURightBottom,
  new: MdiJs.mdiPlusBoxOutline,
  newChild: MdiJs.mdiChevronDownBoxOutline,
  remove: MdiJs.mdiMinusCircleOutline,
  destroy: MdiJs.mdiCloseBoxOutline,
  unindent: MdiJs.mdiChevronDoubleLeft,
  indent: MdiJs.mdiChevronDoubleRight,
  up: MdiJs.mdiChevronDoubleUp,
  down: MdiJs.mdiChevronDoubleDown,
  insertSibling: MdiJs.mdiPlusCircleOutline,
  insertChild: MdiJs.mdiChevronDownCircleOutline,
  insertParent: MdiJs.mdiChevronUpCircleOutline,
  insertLink: MdiJs.mdiArrowRightCircleOutline,
  forum: MdiJs.mdiForumOutline,
  tutorial: MdiJs.mdiSchoolOutline,
  changelog: MdiJs.mdiNewspaperVariantOutline,
  unfold: MdiJs.mdiDotsHorizontal,
  outline: MdiJs.mdiFileTree,
  inbox: MdiJs.mdiTrayFull,
  menu: MdiJs.mdiMenu,
  user: MdiJs.mdiAccountOutline,
  logOut: MdiJs.mdiLogout,
};

export type IconId = keyof typeof mdiIcons | keyof typeof faIcons;

function MdiIcon(props: {icon: keyof typeof mdiIcons}) {
  return <MdiReact.Icon path={mdiIcons[props.icon]} size="1.2em" />;
}

function FontAwesomeIcon(props: {icon: keyof typeof faIcons}) {
  const id = faIcons[props.icon];
  const fas = id === "reddit-alien" ? "fab" : "fas";
  return <i className={`${fas} fa-fw fa-${id}`} aria-hidden="true" />;
}

export function Icon(props: {icon: IconId}) {
  if (props.icon in mdiIcons) {
    return <MdiIcon icon={props.icon as keyof typeof mdiIcons} />;
  } else {
    return <FontAwesomeIcon icon={props.icon as keyof typeof faIcons} />;
  }
}

export function IconLabel(props: {icon: IconId; children: React.ReactNode}) {
  return (
    <span className={style.iconLabel}>
      <Icon icon={props.icon} />
      {props.children}
    </span>
  );
}
