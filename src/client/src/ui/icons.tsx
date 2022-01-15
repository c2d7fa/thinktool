import * as React from "react";
import * as MdiReact from "@mdi/react";
import * as MdiJs from "@mdi/js";

const style = require("./icons.module.scss").default;

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
  insertLink: MdiJs.mdiLinkVariant,
  forum: MdiJs.mdiForumOutline,
  tutorial: MdiJs.mdiSchoolOutline,
  changelog: MdiJs.mdiNewspaperVariantOutline,
  unfold: MdiJs.mdiDotsHorizontal,
  outline: MdiJs.mdiFileTree,
  inbox: MdiJs.mdiTrayFull,
  menu: MdiJs.mdiMenu,
  user: MdiJs.mdiAccountOutline,
  logOut: MdiJs.mdiLogout,
  offline: MdiJs.mdiPowerPlugOffOutline,
  goal: MdiJs.mdiPencilBoxOutline,
};

export type IconId = keyof typeof mdiIcons;

export function Icon(props: {icon: IconId}) {
  return <MdiReact.Icon path={mdiIcons[props.icon]} size="1.2em" />;
}

export function IconLabel(props: {icon: IconId; children: React.ReactNode}) {
  return (
    <span className={style.iconLabel}>
      <Icon icon={props.icon} />
      {props.children}
    </span>
  );
}
