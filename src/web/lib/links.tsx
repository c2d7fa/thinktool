import * as React from "react";
import * as Icons from "./icons";

const styles = require("./links.module.scss");

export function LinkButton(props: {href: string; nofollow?: boolean; children: React.ReactNode}) {
  return (
    <a className={styles.linkButton} href={props.href} rel={props.nofollow ? "nofollow" : undefined}>
      {props.children}
    </a>
  );
}

export function NavigationLink(props: {href: string; icon: Icons.IconId; label: string}) {
  return (
    <a className={styles.navigationLink} href={props.href}>
      <Icons.IconLabel icon={props.icon}>{props.label}</Icons.IconLabel>
    </a>
  );
}

export function IconLinkButton(props: {
  href: string;
  nofollow?: boolean;
  icon: Icons.IconId;
  children: React.ReactNode;
}) {
  return (
    <LinkButton href={props.href} nofollow={props.nofollow}>
      <Icons.IconLabel icon={props.icon}>{props.children}</Icons.IconLabel>
    </LinkButton>
  );
}

export function DemoLinkButton(props: {href: string}) {
  return (
    <a className={styles.demoLink} href={props.href}>
      <Icons.IconLabel icon="demo">Demo</Icons.IconLabel>
    </a>
  );
}
