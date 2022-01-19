import * as React from "react";

import {ExternalLink} from "./ExternalLink";
import {SearchBar, useSearchBarProps} from "../search-bar";
import {ServerApi} from "../sync/server-api";
import {App, UpdateApp} from "../app";
import * as A from "../app";

import * as Icons from "./icons";

const styles = require("./TopBar.module.scss").default;

export function useTopBarProps(args: {
  app: App;
  send: (event: A.Event) => void;
  updateApp: UpdateApp;
  isToolbarShown: boolean;
  setIsToolbarShown(b: boolean): void;
  server?: ServerApi;
  username?: string;
  search(query: string): void;
}): Parameters<typeof TopBar>[0] {
  return {
    isToolbarShown: args.isToolbarShown,
    login:
      args.username === undefined || args.server === undefined
        ? null
        : {
            username: args.username,
            logOutUrl: args.server.logOutUrl,
          },
    onToggleToolbar: () => args.setIsToolbarShown(!args.isToolbarShown),
    searchBar: useSearchBarProps(args.app, args.updateApp, args.send, args.search),
  };
}

export function TopBar(props: {
  isToolbarShown: boolean;
  login: null | {username: string; logOutUrl: string};

  onToggleToolbar(): void;

  searchBar: Parameters<typeof SearchBar>[0];
}) {
  return (
    <div className={styles.topBar}>
      <div className={styles.left}>
        <ExternalLink className={styles.logo} href="/">
          Thinktool
        </ExternalLink>
        <button onClick={() => props.onToggleToolbar()}>
          <Icons.IconLabel icon="menu">{props.isToolbarShown ? "Hide" : "Show"} Menu</Icons.IconLabel>
        </button>
      </div>
      <div className={styles.middle}>
        <SearchBar {...props.searchBar} />
      </div>
      <div className={styles.right}>
        {props.login && (
          <div className={styles.currentUser}>
            <ExternalLink className={styles.username} href="/user.html">
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
