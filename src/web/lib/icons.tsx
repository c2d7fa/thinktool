import * as React from "react";

import * as MdiJs from "@mdi/js";
import * as MdiReact from "@mdi/react";

const styles = require("./icons.module.scss");

const icons = {
  sourceCode: MdiJs.mdiGithub,
  forum: MdiJs.mdiReddit,
  blog: MdiJs.mdiNewspaperVariantOutline,
  download: MdiJs.mdiLaptop,
  login: MdiJs.mdiLogin,
  demo: MdiJs.mdiPlayCircleOutline,
  recoverAccount: MdiJs.mdiAccountLockOpenOutline,
  signup: MdiJs.mdiAccountPlusOutline,
} as const;

export type IconId = keyof typeof icons;

export function IconLabel(props: {icon: IconId; children: React.ReactNode}) {
  return (
    <span className={styles.iconLabel}>
      <MdiReact.Icon className={styles.icon} path={icons[props.icon]} size="1.2em" /> {props.children}
    </span>
  );
}
