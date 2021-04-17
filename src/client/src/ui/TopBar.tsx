import * as React from "react";
import {Context} from "../context";
import {ExternalLink} from "./ExternalLink";

export function useTopBarProps(
  context: Context,
  args: {isToolbarShown: boolean; setIsToolbarShown(b: boolean): void; username?: string},
): Parameters<typeof TopBar>[0] {
  return {
    isToolbarShown: args.isToolbarShown,
    login:
      args.username === undefined || context.server === undefined
        ? null
        : {
            username: args.username,
            logOutUrl: context.server.logOutUrl,
          },
    onToggleToolbar: () => args.setIsToolbarShown(!args.isToolbarShown),
  };
}

export function TopBar(props: {
  isToolbarShown: boolean;
  login: null | {username: string; logOutUrl: string};

  onToggleToolbar(): void;
}) {
  return (
    <div className="top-bar">
      <div className="left">
        <ExternalLink className="logo" href="/">
          Thinktool
        </ExternalLink>
        <button onClick={() => props.onToggleToolbar()}>
          <i className="icon fas fa-bars" />
          {props.isToolbarShown ? "Hide" : "Show"} Menu
        </button>
      </div>
      <div className="middle">
        <div className="search-bar">Press Alt-F to search.</div>
      </div>
      <div className="right">
        {props.login && (
          <div id="current-user">
            <ExternalLink className="username" href="/user.html">
              {props.login.username}
            </ExternalLink>
            <a className="log-out" href={props.login.logOutUrl}>
              Log Out
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
