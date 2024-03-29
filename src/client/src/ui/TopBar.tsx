import * as React from "react";

import {ExternalLink} from "./ExternalLink";
import {SearchBar} from "../search-bar";
import {Server} from "../remote-types";
import * as A from "../app";

import * as Icons from "./icons";

const styles = require("./TopBar.module.scss").default;

export function login(args: {server?: Server; username?: string}) {
  return args.username === undefined || args.server === undefined
    ? null
    : {
        username: args.username,
        logOutUrl: args.server.logOutUrl,
      };
}

export function TopBar(props: {
  isToolbarShown: boolean;
  login: null | {username: string; logOutUrl: string};

  onToggleToolbar(): void;

  popup: Parameters<typeof SearchBar>[0]["popup"];
  send(event: A.Event): void;
}) {
  return (
    <div className={styles.topBar}>
      <div className={styles.left}>
        <ExternalLink send={props.send} className={styles.logo} href="/">
          Thinktool
        </ExternalLink>
        <button onClick={() => props.onToggleToolbar()}>
          <Icons.IconLabel icon="menu">{props.isToolbarShown ? "Hide" : "Show"} Menu</Icons.IconLabel>
        </button>
      </div>
      <div className={styles.middle}>
        <SearchBar popup={props.popup} send={props.send} />
      </div>
      <div className={styles.right}>
        {props.login && (
          <div className={styles.currentUser}>
            <ExternalLink send={props.send} className={styles.username} href="/user">
              <Icons.IconLabel icon="user">{props.login.username}</Icons.IconLabel>
            </ExternalLink>
            <a href={props.login.logOutUrl}>
              <Icons.IconLabel icon="logOut">Log Out</Icons.IconLabel>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
