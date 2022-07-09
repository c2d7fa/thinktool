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
import {ExternalLinkProvider, ExternalLinkType} from "./ui/ExternalLink";
import UserPage from "./ui/UserPage";
import {login, TopBar} from "./ui/TopBar";
import {OfflineIndicator} from "./offline-indicator";

import * as React from "react";
import * as ReactDOM from "react-dom";

import {useMemoWarning} from "./react-utils";
import {OrphanList} from "./orphans/ui";
import {Search} from "@thinktool/search";
import {Outline} from "./ui/outline";
import {isStorageServer, Server, Storage} from "./remote-types";

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

function useServerChanges(server: Server | null, updateApp: (f: (app: A.App) => A.App) => void) {
  React.useEffect(() => {
    if (server === null) return;

    return server.onChanges(async (changes) => {
      const loadThingDataTasks = changes.map((thing) =>
        (async () => ({
          thing,
          data: await server.getThingData(thing),
        }))(),
      );
      const changedThings = await Promise.all(loadThingDataTasks);
      updateApp((app) => Sync.receiveChangedThingsFromServer(app, changedThings));
    });
  }, []);
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

function useRepeatedlyCheck(f: () => Promise<"continue" | "stop">, ms: number): {start(): void} {
  const timeoutRef = React.useRef<number | null>(null);
  const isRunningRef = React.useRef(false);

  const start = React.useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    timeoutRef.current = window.setTimeout(async () => {
      const result = await f();
      isRunningRef.current = false;
      if (result === "continue") {
        start();
      }
    }, ms);
  }, []);

  return {start};
}

function useSendWithSync({
  updateAppWithoutSaving,
  server,
  initialState,
  storage,
  openExternalUrl,
  search,
}: {
  updateAppWithoutSaving: (f: (app: A.App) => A.App) => void;
  server: Server | undefined;
  initialState: Sync.StoredState;
  storage: Storage;
  openExternalUrl(url: string): void;
  search: Search;
}): A.Send {
  const [lastSyncedState, setLastSyncedState] = React.useState<Sync.StoredState>(initialState);

  const resyncInterval = useRepeatedlyCheck(async () => {
    if (server === undefined) return "stop";
    try {
      const remoteState = await Sync.loadStoredStateFromStorage(storage);
      console.log("Reconnected successfully.");
      updateAppWithoutSaving((app) => A.update(app, {type: "serverPingResponse", result: "success", remoteState}));
      return "stop";
    } catch (e) {
      console.log("Still could not contact server.");
      return "continue";
    }
  }, 2000);

  React.useEffect(() => {
    if (server === undefined) return;

    server.onError((error) => {
      if (error.error === "disconnected") {
        resyncInterval.start();
        updateAppWithoutSaving((app) => A.update(app, {type: "serverDisconnected"}));
      } else if (error.error === "error") {
        // [TODO] Add special handling for this case!
        console.error(error);
        updateAppWithoutSaving((app) => A.update(app, {type: "serverDisconnected"}));
      }
    });

    window.addEventListener("offline", () => {
      updateAppWithoutSaving((app) => A.update(app, {type: "serverDisconnected"}));
    });

    window.addEventListener("online", async () => {
      const remoteState = await Sync.loadStoredStateFromStorage(storage);
      setLastSyncedState(remoteState);
      updateAppWithoutSaving((app) => A.update(app, {type: "serverPingResponse", result: "success", remoteState}));
    });
  }, []);

  const storageExecutionContext = useMemoWarning(
    "storageExecutionContext",
    () => new Sto.StorageExecutionContext(storage, window),
    [storage],
  );

  const updateApp = useMemoWarning(
    "updateApp",
    () => {
      return (f: (app: A.App) => A.App) => {
        updateAppWithoutSaving((app) => {
          const newApp = f(app);

          setLastSyncedState((lastSyncedState) => {
            const nextAppState = Sync.storedStateFromApp(newApp);

            if (server && A.isDisconnected(newApp)) {
              console.log("Won't try to push changes because we're offline.");
              return lastSyncedState;
            }

            const changes = Sync.changes(lastSyncedState, nextAppState);
            storageExecutionContext.pushChanges(changes);

            return nextAppState;
          });

          return newApp;
        });
      };
    },
    [storage],
  );

  return React.useCallback((event: A.Event) => {
    updateApp((app) => {
      const result = A.handle(app, event);
      if (result?.effects?.url) openExternalUrl(result.effects.url);
      if (result?.effects?.search) {
        if (result.effects.search.items) {
          search.reset(result.effects.search.items);
        }
        search.query(result.effects.search.query, 25);
      }
      return result.app;
    });
  }, []);
}

function App_({
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
  const storage = remote;
  const server = isStorageServer(remote) ? remote : undefined;

  const isDevelopment = React.useMemo(() => window.location.hostname === "localhost", []);

  const [app, updateAppWithoutSaving] = React.useState<A.App>(() => A.initialize(initialState));

  const changelog = ChangelogData;

  const search = React.useMemo<Search>(() => {
    const search = new Search([]);
    search.on("results", (results) =>
      send({type: "searchResponse", things: results.map((result) => result.thing)}),
    );
    return search;
  }, []);

  const send = useSendWithSync({
    initialState: Sync.storedStateFromApp(app),
    server,
    storage,
    updateAppWithoutSaving,
    openExternalUrl,
    search,
  });

  useServerChanges(server ?? null, updateAppWithoutSaving);
  useGlobalShortcuts(send);

  useDragAndDrop(app, send);

  const appElementRef = React.useRef<HTMLDivElement>(null);

  const [showSplash, setShowSplash] = React.useState<boolean>(
    !isDevelopment && Tutorial.isActive(app.tutorialState),
  );

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
      <OfflineIndicator isDisconnected={A.isDisconnected(app)} />
      <Sync.Dialog.SyncDialog dialog={A.syncDialog(app)} send={send} />
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
      <Changelog changelog={changelog} visible={app.changelogShown} send={send} />
      <MainView view={view_} send={send} />
      {showSplash && ReactDOM.createPortal(<Splash splashCompleted={() => setShowSplash(false)} />, document.body)}
    </div>
  );
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
  const [app, setApp] = React.useState<JSX.Element>(<div>Loading...</div>);

  React.useEffect(() => {
    (async () => {
      setApp(
        <ExternalLinkProvider value={props.ExternalLink}>
          <App_
            initialState={{
              fullStateResponse: await props.storage.getFullState(),
              toolbarShown: true,
              tutorialFinished: await props.storage.getTutorialFinished(),
              urlHash: "",
            }}
            remote={props.storage}
            openExternalUrl={props.openExternalUrl}
          />
        </ExternalLinkProvider>,
      );
    })();
  }, []);

  return app;
}

export function App({apiHost}: {apiHost: string}) {
  const server = new ApiHostServer({apiHost});

  const [app, setApp] = React.useState<JSX.Element>(<div>Loading...</div>);

  React.useEffect(() => {
    (async () => {
      const username = await server.getUsername();
      if (username === null) {
        console.log("Not logged in. Redirecting to login page.");
        window.location.href = "/login";
      }

      setApp(
        <App_
          initialState={{
            fullStateResponse: await server.getFullState(),
            toolbarShown: (await server.getToolbarState()).shown,
            tutorialFinished: await server.getTutorialFinished(),
            urlHash: window.location.hash,
          }}
          username={username ?? "<error>"}
          remote={server}
          openExternalUrl={(url) => window.open(url, "_blank")}
        />,
      );
    })();
  }, []);

  return app;
}

export function Demo(props: {data: Communication.FullStateResponse}) {
  const [app, setApp] = React.useState<JSX.Element>(<div>Loading...</div>);

  React.useEffect(() => {
    (async () => {
      setApp(
        <App_
          initialState={{
            fullStateResponse: props.data,
            toolbarShown: true,
            tutorialFinished: false,
            urlHash: "",
          }}
          remote={Sto.ignore()}
          openExternalUrl={(url) => window.open(url, "_blank")}
        />,
      );
    })();
  }, []);

  return app;
}

export function User(props: {apiHost: string}) {
  return <UserPage server={new ApiHostServer({apiHost: props.apiHost})} />;
}

export * as Storage from "./sync/storage";
export {Communication} from "@thinktool/shared";
