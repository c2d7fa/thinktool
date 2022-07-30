import "../app.scss";

import * as ChangelogData from "./changes.json";

import {useThingUrl} from "./url";

import * as Tutorial from "./tutorial";
import * as Actions from "./actions";
import * as Sh from "./shortcuts";
import * as A from "./app";

import * as Toolbar from "./ui/Toolbar";
import TutorialBox from "./ui/Tutorial";
import Changelog from "./ui/Changelog";
import UserPage from "./ui/UserPage";
import {login, TopBar} from "./ui/TopBar";
import {OfflineIndicator} from "./offline-indicator";
import {SyncDialog} from "./sync/dialog";

import * as React from "react";
import * as ReactDOM from "react-dom";

import {OrphanList} from "./orphans/ui";
import {Search} from "@thinktool/search";
import {Outline} from "./ui/outline";
import {isError, isStorageServer, Server, ServerError, Storage} from "./remote-types";

export type {Storage, Server, ServerError};

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
      if (changedThings.some(isError)) {
        console.error("Error while loading changed things", changedThings);
      } else {
        send({
          type: "receivedChanges",
          changes: changedThings as any, // [TODO] Better type checking
        });
      }
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
      const remoteState = await loadStoredStateFromStorage(deps.remote);
      if (isError(remoteState)) {
        console.log("Still could not contact server.");
        deps.send({type: "serverPingResponse", result: "failed"});
      } else {
        console.log("Reconnected successfully.");
        deps.send({type: "serverPingResponse", result: "success", remoteState});
      }
    }, 2000);
  }
  if (effects.changes) {
    console.log("Pushing changes %o", effects.changes);
    for (const deleted of effects.changes.deleted) {
      deps.remote.deleteThing(deleted);
    }
    if (effects.changes.updated.length > 0) {
      deps.remote.updateThings(effects.changes.updated);
    }
    for (const edited of effects.changes.edited) {
      deps.remote.setContent(edited.thing, edited.content);
    }
    if (effects.changes.tutorialFinished) {
      deps.remote.setTutorialFinished();
    }
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

async function loadStoredStateFromStorage(storage: Storage): Promise<A.StoredState | ServerError> {
  const fullStateResponse = await storage.getFullState();
  const tutorialFinished = await storage.getTutorialFinished();
  if (isError(fullStateResponse)) return fullStateResponse;
  if (isError(tutorialFinished)) return tutorialFinished;
  return {fullStateResponse, tutorialFinished};
}

function useServerReconnect(server: Server | undefined, send: A.Send) {
  React.useEffect(() => {
    if (server === undefined) return;

    window.addEventListener("offline", () => {
      send({type: "serverDisconnected"});
    });

    window.addEventListener("online", async () => {
      const remoteState = await loadStoredStateFromStorage(server);
      if (isError(remoteState)) return;
      send({
        type: "serverPingResponse",
        result: "success",
        remoteState,
      });
    });
  }, []);
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

  React.useEffect(() => {
    if (effectsQueue.pendingEffects.length === 0) return;
    for (const effect of effectsQueue.pendingEffects) {
      executeEffects(effect, {...deps, search});
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
      <SyncDialog dialog={view_.syncDialog} send={send} />
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
      <TutorialBox tutorial={view_.tutorial} send={send} />
      <Changelog changelog={ChangelogData} visible={app.changelogShown} send={send} />
      <MainView view={view_} send={send} />
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

export function App(props: {remote: Storage | Server; openExternalUrl?: (url: string) => void}) {
  const server = isStorageServer(props.remote) ? props.remote : undefined;

  const [rendered, setRendered] = React.useState<JSX.Element>(<div>Loading...</div>);

  React.useEffect(() => {
    (async () => {
      const username = await (async () => {
        if (!server) return undefined;
        const username = await server.getUsername();
        if (username === null || isError(username)) {
          console.log("Not logged in. Redirecting to login page.");
          window.location.href = "/login";
          return undefined;
        }
        return username;
      })();

      const fullStateResponse = await props.remote.getFullState();
      const toolbarState = server ? await server.getToolbarState() : {shown: true};
      const tutorialFinished = await props.remote.getTutorialFinished();

      if (isError(fullStateResponse)) throw "unable to connect to server";
      if (isError(toolbarState)) throw "unable to connect to server";
      if (isError(tutorialFinished)) throw "unable to connect to server";

      setRendered(
        <LoadedApp
          initialState={{
            fullStateResponse,
            toolbarShown: toolbarState.shown,
            tutorialFinished,
            urlHash: window?.location?.hash ?? "",
          }}
          remote={props.remote}
          openExternalUrl={props.openExternalUrl ?? ((url: string) => window.open(url, "_blank"))}
          username={username}
        />,
      );
    })();
  }, []);

  return rendered;
}

export function User(props: {remote: Server}) {
  return <UserPage server={props.remote} />;
}

export {Communication} from "@thinktool/shared";
