import "../app.scss";

import {Communication} from "@thinktool/shared";

import * as ChangelogData from "./changes.json";

import {useThingUrl} from "./url";

import * as Tutorial from "./tutorial";
import {ApiHostServer} from "./sync/server-api";
import * as Sto from "./sync/storage";
import * as Actions from "./actions";
import * as Sh from "./shortcuts";
import * as A from "./app";
import * as Sync from "./sync";

import * as Toolbar from "./ui/Toolbar";
import TutorialBox from "./ui/Tutorial";
import Changelog from "./ui/Changelog";
import Splash from "./ui/Splash";
import {DefaultExternalLink, ExternalLinkProvider, ExternalLinkType} from "./ui/ExternalLink";
import UserPage from "./ui/UserPage";
import {login, TopBar} from "./ui/TopBar";
import {OfflineIndicator} from "./offline-indicator";

import * as React from "react";
import * as ReactDOM from "react-dom";

import {useMemoWarning} from "./react-utils";
import {OrphanList} from "./orphans/ui";
import {Search} from "@thinktool/search";
import {Outline} from "./ui/outline";
import {isStorageServer, Server, ServerError, Storage} from "./remote-types";

function useGlobalShortcuts(send: (event: A.Event) => void) {
  React.useEffect(() => {
    function onTopLevelKeyDown(ev: KeyboardEvent) {
      if (Sh.matches(ev, Actions.shortcut("undo"))) {
        send({type: "action", action: "undo"});
        ev.preventDefault();
      } else if (Sh.matches(ev, Actions.shortcut("find"))) {
        send({type: "action", action: "find"});
        ev.preventDefault();
      }
    }
    document.addEventListener("keydown", onTopLevelKeyDown);
    return () => {
      console.warn("Unregistering global 'keydown' event listener. This should not normally happen.");
      document.removeEventListener("keydown", onTopLevelKeyDown);
    };
  }, [send]);
}

function useServerChanges(server: Server | undefined, send: A.Send) {
  React.useEffect(() => {
    if (server === undefined) return;

    return server.onChanges(async (changes) => {
      const loadThingDataTasks = changes.map((thing) =>
        (async () => ({
          thing,
          data: await server.getThingData(thing),
        }))(),
      );
      const changedThings = await Promise.all(loadThingDataTasks);
      send({type: "receivedChanges", changes: changedThings});
    });
  }, [send]);
}

function useDragAndDrop(app: A.App, send: A.Send) {
  // Register event listeners when drag becomes active, unregister when drag
  // becomes inactive. We do this to avoid performance issues due to constantly
  // listening to mouse movements. Is it necessary? Is there a cleaner solution?
  React.useEffect(() => {
    if (!A.isDragging(app)) return;

    // We do it this way to override other cursors. For example, just setting
    // document.body.style.cursor would still give a pointer cursor when
    // hovering a link.
    const styleElement = document.createElement("style");
    styleElement.innerHTML = "* { cursor: grab !important; }";
    document.body.appendChild(styleElement);

    function findNodeAt({x, y}: {x: number; y: number}): {id: number} | null {
      let element: HTMLElement | null | undefined = document.elementFromPoint(x, y) as HTMLElement;
      while (element && element.dataset.dragItemId === undefined) {
        element = element?.parentElement;
      }
      if (element === null) return null;
      if (!element.dataset.dragItemId) return null;
      return {id: +element.dataset.dragItemId};
    }

    function mousemove(ev: MouseEvent): void {
      const {clientX: x, clientY: y} = ev;
      send({type: "dragHover", id: findNodeAt({x, y})?.id ?? null});
    }

    function touchmove(ev: TouchEvent): void {
      const {clientX: x, clientY: y} = ev.changedTouches[0];
      send({type: "dragHover", id: findNodeAt({x, y})?.id ?? null});
    }

    window.addEventListener("mousemove", mousemove);
    window.addEventListener("touchmove", touchmove);

    function mouseup(ev: MouseEvent | TouchEvent): void {
      send({type: "dragEnd", modifier: ev.ctrlKey ? "copy" : "move"});
    }

    window.addEventListener("mouseup", mouseup);
    window.addEventListener("touchend", mouseup);

    return () => {
      styleElement.remove();

      window.removeEventListener("mousemove", mousemove);
      window.removeEventListener("touchmove", touchmove);
      window.removeEventListener("mouseup", mouseup);
      window.removeEventListener("touchend", mouseup);
    };
  }, [A.isDragging(app), send]);
}

function executeEffects(
  effects: A.Effects,
  deps: {
    openExternalUrl(url: string): void;
    send: A.Send;
    search: Search;
    storageExecutionContext: Sto.StorageExecutionContext;
    remote: Storage;
  },
): void {
  if (effects.url) deps.openExternalUrl(effects.url);
  if (effects.search) {
    if (effects.search.items) {
      deps.search.reset(effects.search.items);
    }
    deps.search.query(effects.search.query, 25);
  }
  if (effects.tryReconnect) {
    setTimeout(async () => {
      console.log("Trying to reconnect to server...");
      try {
        const remoteState = await Sync.loadStoredStateFromStorage(deps.remote);
        console.log("Reconnected successfully.");
        deps.send({type: "serverPingResponse", result: "success", remoteState});
      } catch (e) {
        console.log("Still could not contact server.");
        deps.send({type: "serverPingResponse", result: "failed"});
      }
    }, 2000);
  }
  if (effects.changes) {
    console.log("Pushing changes %o", effects.changes);
    deps.storageExecutionContext.pushChanges(effects.changes);
  }
}

function useSend({
  updateApp,
  effectsQueue,
}: {
  updateApp: (f: (app: A.App) => A.App) => void;
  effectsQueue: {pushEffects(effects: A.Effects): void};
}): A.Send {
  return React.useCallback((event: A.Event) => {
    updateApp((app) => {
      const result = A.handle(app, event);
      if (result?.effects) effectsQueue.pushEffects(result.effects!);
      return result.app;
    });
  }, []);
}

function useServerReconnect(server: Server | undefined, send: A.Send) {
  React.useEffect(() => {
    if (server === undefined) return;

    server.onError((error) => {
      if (error.error === "disconnected") console.warn("Disconnected from server.");
      else console.error(error);
      send({type: "serverDisconnected"});
    });

    window.addEventListener("offline", () => {
      send({type: "serverDisconnected"});
    });

    window.addEventListener("online", async () => {
      send({
        type: "serverPingResponse",
        result: "success",
        remoteState: await Sync.loadStoredStateFromStorage(server),
      });
    });
  }, []);
}

function useStorageExecutionContext({remote}: {remote: Storage}): Sto.StorageExecutionContext {
  return useMemoWarning("storageExecutionContext", () => new Sto.StorageExecutionContext(remote, window), [
    remote,
  ]);
}

function useSearch({send}: {send: A.Send}) {
  return React.useMemo<Search>(() => {
    const search = new Search([]);
    search.on("results", (results) =>
      send({type: "searchResponse", things: results.map((result) => result.thing)}),
    );
    return search;
  }, []);
}

function useExecuteEffects(
  effectsQueue: {pendingEffects: A.Effects[]; clearEffects(): void},
  deps: {
    openExternalUrl: (url: string) => void;
    send: A.Send;
    remote: Storage;
  },
) {
  const search = useSearch({send: deps.send});
  const storageExecutionContext = useStorageExecutionContext({remote: deps.remote});

  React.useEffect(() => {
    if (effectsQueue.pendingEffects.length === 0) return;
    for (const effect of effectsQueue.pendingEffects) {
      executeEffects(effect, {...deps, search, storageExecutionContext});
    }
    effectsQueue.clearEffects();
  }, [effectsQueue]);
}

function useEffectsQueue() {
  const [pendingEffects, setPendingEffects] = React.useState<A.Effects[]>([]);

  const clearEffects = React.useCallback(() => {
    setPendingEffects([]);
  }, []);

  const pushEffects = React.useCallback((effects: A.Effects) => {
    setPendingEffects((pendingEffects) => [...pendingEffects, effects]);
  }, []);

  return {
    pendingEffects,
    clearEffects,
    pushEffects,
  };
}

function useFlushChanges({send}: {send: A.Send}) {
  React.useEffect(() => {
    setInterval(() => send({type: "flushChanges"}), 1000);
  }, []);
}

function LoadedApp({
  initialState,
  username,
  remote,
  openExternalUrl,
}: {
  initialState: A.InitialState;
  username?: string;
  remote: Storage | Server;
  openExternalUrl(url: string): void;
}) {
  const [app, updateApp] = React.useState<A.App>(() => A.initialize(initialState));
  const effectsQueue = useEffectsQueue();

  const send = useSend({updateApp, effectsQueue});
  useExecuteEffects(effectsQueue, {openExternalUrl, send, remote});

  useGlobalShortcuts(send);
  useDragAndDrop(app, send);
  useFlushChanges({send});

  const server = isStorageServer(remote) ? remote : undefined;
  useServerReconnect(server, send);
  useServerChanges(server, send);

  const appElementRef = React.useRef<HTMLDivElement>(null);

  const [showSplash, setShowSplash] = React.useState<boolean>(Tutorial.isActive(app.tutorialState));

  const onFocusBackground = React.useCallback(
    (ev: React.FocusEvent) => {
      if (ev.target === appElementRef.current) send({type: "unfocus"});
    },
    [send],
  );

  const view_ = A.view(app);

  useThingUrl({current: view_.url.root, send});

  return (
    <div ref={appElementRef} id="app" spellCheck={false} onFocus={onFocusBackground} tabIndex={-1} className="app">
      <OfflineIndicator isDisconnected={view_.offlineIndicator.shown} />
      <Sync.Dialog.SyncDialog dialog={view_.syncDialog} send={send} />
      <div className="app-header">
        <TopBar
          isToolbarShown={view_.toolbar.shown}
          login={login({server, username})}
          onToggleToolbar={() => send({type: "toggleToolbar"})}
          popup={view_.popup}
          send={send}
        />
        <Toolbar.Toolbar send={send} toolbar={view_.toolbar} />
      </div>
      {!showSplash && <TutorialBox tutorial={view_.tutorial} send={send} />}
      <Changelog changelog={ChangelogData} visible={app.changelogShown} send={send} />
      <MainView view={view_} send={send} />
      {showSplash && ReactDOM.createPortal(<Splash splashCompleted={() => setShowSplash(false)} />, document.body)}
    </div>
  );
}

function AppWithRemote(props: {
  remote: Storage | Server;
  openExternalUrl(url: string): void;
  ExternalLink?: ExternalLinkType;
}) {
  const server = isStorageServer(props.remote) ? props.remote : undefined;

  const [rendered, setRendered] = React.useState<JSX.Element>(<div>Loading...</div>);

  React.useEffect(() => {
    (async () => {
      const username = await (async () => {
        if (!server) return undefined;
        const username = await server.getUsername();
        if (username === null) {
          console.log("Not logged in. Redirecting to login page.");
          window.location.href = "/login";
          return undefined;
        }
        return username;
      })();

      setRendered(
        <ExternalLinkProvider value={props.ExternalLink ?? DefaultExternalLink}>
          <LoadedApp
            initialState={{
              fullStateResponse: await props.remote.getFullState(),
              toolbarShown: server ? (await server.getToolbarState()).shown : true,
              tutorialFinished: await props.remote.getTutorialFinished(),
              urlHash: window?.location?.hash ?? "",
            }}
            remote={props.remote}
            openExternalUrl={props.openExternalUrl}
            username={username}
          />
        </ExternalLinkProvider>,
      );
    })();
  }, []);

  return rendered;
}

function MainView(props: {view: ReturnType<typeof A.view>; send(event: A.Event): void}) {
  return props.view.tab === "orphans" ? (
    <OrphanList view={props.view} send={props.send} />
  ) : (
    <Outline outline={props.view} send={props.send} />
  );
}

// ==

export function LocalApp(props: {
  storage: Storage;
  ExternalLink: ExternalLinkType;
  openExternalUrl: (url: string) => void;
}) {
  return (
    <AppWithRemote
      remote={props.storage}
      openExternalUrl={props.openExternalUrl}
      ExternalLink={props.ExternalLink}
    />
  );
}

type AppArgs = {apiHost: string} | {remote: Storage | Server};

export type RemoteStorage = Storage;
export type RemoteServer = Server;
export type RemoteServerError = ServerError;

export function App(args: AppArgs) {
  if ("apiHost" in args) {
    const server = React.useMemo(() => new ApiHostServer({apiHost: args.apiHost}), []);
    return <AppWithRemote remote={server} openExternalUrl={(url) => window.open(url, "_blank")} />;
  } else {
    return <AppWithRemote remote={args.remote} openExternalUrl={(url) => window.open(url, "_blank")} />;
  }
}

export function Demo(props: {data: Communication.FullStateResponse}) {
  return <AppWithRemote remote={Sto.ignore(props.data)} openExternalUrl={(url) => window.open(url, "_blank")} />;
}

export function User(props: {apiHost: string}) {
  return <UserPage server={new ApiHostServer({apiHost: props.apiHost})} />;
}

export * as Storage from "./sync/storage";
export {Communication} from "@thinktool/shared";
