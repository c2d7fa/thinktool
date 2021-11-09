import "../app.scss";

import {Communication} from "@thinktool/shared";

import * as ChangelogData from "./changes.json";

import {extractThingFromURL, useThingUrl} from "./url";

import * as T from "./tree";
import * as Tutorial from "./tutorial";
import {ServerApi} from "./sync/server-api";
import * as Storage from "./sync/storage";
import * as Actions from "./actions";
import * as Sh from "./shortcuts";
import * as A from "./app";
import * as Drag from "./drag";
import * as P from "./popup";
import * as Sync from "./sync";

import * as Editor from "./ui/Editor";
import * as Toolbar from "./ui/Toolbar";
import Changelog from "./ui/Changelog";
import Splash from "./ui/Splash";
import {ExternalLinkProvider, ExternalLinkType} from "./ui/ExternalLink";
import * as Item from "./item";
import UserPage from "./ui/UserPage";
import * as PlaceholderItem from "./ui/PlaceholderItem";
import * as Outline from "./outline";
import {TopBar, useTopBarProps} from "./ui/TopBar";
import {OfflineIndicator} from "./offline-indicator";

import * as React from "react";
import * as ReactDOM from "react-dom";

import {Receiver, receiver as createReceiver} from "./receiver";
import {Message} from "./messages";
import {useMemoWarning, usePropRef} from "./react-utils";
import {OrphanList, useOrphanListProps} from "./orphans/ui";
import {Search} from "@thinktool/search";

function useGlobalShortcuts(sendEvent: Receiver<Message>["send"]) {
  React.useEffect(() => {
    function onTopLevelKeyDown(ev: KeyboardEvent) {
      if (Sh.matches(ev, Actions.shortcut("undo"))) {
        sendEvent("action", {action: "undo"});
        ev.preventDefault();
      } else if (Sh.matches(ev, Actions.shortcut("find"))) {
        sendEvent("action", {action: "find"});
        ev.preventDefault();
      }
    }
    document.addEventListener("keydown", onTopLevelKeyDown);
    return () => {
      console.warn("Unregistering global 'keydown' event listener. This should not normally happen.");
      document.removeEventListener("keydown", onTopLevelKeyDown);
    };
  }, [sendEvent]);
}

function useServerChanges(server: ServerApi | null, updateApp: (f: (app: A.App) => A.App) => void) {
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

function useDragAndDrop(app: A.App, updateApp: (f: (app: A.App) => A.App) => void) {
  // Register event listeners when drag becomes active, unregister when drag
  // becomes inactive. We do this to avoid performance issues due to constantly
  // listening to mouse movements. Is it necessary? Is there a cleaner solution?
  React.useEffect(() => {
    if (!Drag.isActive(app.drag)) return;

    // We do it this way to override other cursors. For example, just setting
    // document.body.style.cursor would still give a pointer cursor when
    // hovering a link.
    const styleElement = document.createElement("style");
    styleElement.innerHTML = "* { cursor: grab !important; }";
    document.body.appendChild(styleElement);

    function findNodeAt({x, y}: {x: number; y: number}): {id: number} | null {
      let element: HTMLElement | null | undefined = document.elementFromPoint(x, y) as HTMLElement;
      while (element && !element.classList.contains("item")) {
        element = element?.parentElement;
      }
      if (element === null) return null;
      if (!element.dataset.id) return null;
      return {id: +element.dataset.id};
    }

    function mousemove(ev: MouseEvent): void {
      const {clientX: x, clientY: y} = ev;
      updateApp((app) => A.merge(app, {drag: Drag.hover(app.drag, findNodeAt({x, y}))}));
    }

    function touchmove(ev: TouchEvent): void {
      const {clientX: x, clientY: y} = ev.changedTouches[0];
      updateApp((app) => A.merge(app, {drag: Drag.hover(app.drag, findNodeAt({x, y}))}));
    }

    window.addEventListener("mousemove", mousemove);
    window.addEventListener("touchmove", touchmove);

    function mouseup(ev: MouseEvent | TouchEvent): void {
      updateApp((app) => Drag.drop(app, ev.ctrlKey ? "copy" : "move"));
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
  }, [Drag.isActive(app.drag), updateApp]);
}

function App_({
  storedState,
  username,
  storage,
  server,
  openExternalUrl,
}: {
  storedState: Sync.StoredState;
  username?: string;
  storage: Storage.Storage;
  server?: ServerApi;
  openExternalUrl(url: string): void;
}) {
  const isDevelopment = React.useMemo(() => window.location.hostname === "localhost", []);

  const receiver = React.useMemo(() => createReceiver<Message>(), []);

  const [app, updateAppWithoutSaving] = React.useState<A.App>(() => {
    let result = Sync.loadAppFromStoredState(storedState);
    result = A.jump(result, extractThingFromURL());
    if (isDevelopment) result = A.merge(result, {tutorialState: Tutorial.initialize(true)});
    return result;
  });

  const changelog = ChangelogData;

  useThingUrl({
    current: T.thing(app.tree, T.root(app.tree)),
    jump(thing: string) {
      updateAppWithoutSaving(A.merge(app, {tree: T.fromRoot(app.state, thing)}));
    },
  });

  React.useEffect(() => {
    server?.onError((error) => {
      if (error.error === "disconnected") {
        updateAppWithoutSaving(A.serverDisconnected);
      } else if (error.error === "error") {
        // [TODO] Add special handling for this case!
        console.error(error);
        updateAppWithoutSaving(A.serverDisconnected);
      }
    });

    if (server !== null) {
      window.addEventListener("offline", () => {
        updateAppWithoutSaving(A.serverDisconnected);
      });

      window.addEventListener("online", () => {
        updateAppWithoutSaving(A.serverReconnected);
      });
    }
  }, []);

  const [lastSyncedState, setLastSyncedState] = React.useState<Sync.StoredState>(storedState);

  const updateApp = useMemoWarning(
    "updateApp",
    () => {
      const storageExecutionContext = new Storage.StorageExecutionContext(storage, window);

      return (f: (app: A.App) => A.App) => {
        updateAppWithoutSaving((app) => {
          const newApp = f(app);

          // Synchronize with storage.
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

  const search = React.useMemo<Search>(() => {
    const search = new Search([]);
    search.on("results", (results) =>
      updateApp((app) =>
        A.merge(app, {
          popup: P.receiveResults(
            app.popup,
            app.state,
            results.map((result) => result.thing),
          ),
        }),
      ),
    );
    return search;
  }, []);

  React.useEffect(() => {
    receiver.subscribe("action", (ev) => {
      updateApp((app) => {
        const result = Actions.update(app, ev.action);
        if (result.undo) console.warn("Undo isn't currently supported.");
        if (result.url) openExternalUrl(result.url);
        if (result.search) receiver.send("search", {search: result.search});
        return result.app;
      });
    });

    receiver.subscribe("search", (ev) => {
      search.reset(ev.search.items);
      search.query(ev.search.query, 25);
    });
  }, []);

  useServerChanges(server ?? null, updateAppWithoutSaving);
  useGlobalShortcuts(receiver.send);

  useDragAndDrop(app, updateApp);

  const [isToolbarShown, setIsToolbarShown_] = React.useState<boolean>(true);
  function setIsToolbarShown(isToolbarShown: boolean) {
    setIsToolbarShown_(isToolbarShown);
    server?.setToolbarState({shown: isToolbarShown}).catch((error) => {
      console.warn("Error while setting toolbar state: %o", error);
    });
  }
  React.useEffect(() => {
    server
      ?.getToolbarState()
      .then(({shown}) => setIsToolbarShown_(shown))
      .catch((error) => {
        console.warn("Error while getting toolbar state: %o", error);
      });
  }, []);

  const appElementRef = React.useRef<HTMLDivElement>(null);

  const [showSplash, setShowSplash] = React.useState<boolean>(
    !isDevelopment && Tutorial.isActive(app.tutorialState),
  );

  const onFocusApp = React.useCallback(
    (ev: React.FocusEvent) => {
      if (ev.target === appElementRef.current) {
        console.log("Unfocusing item due to click on background");
        updateApp((app) => A.merge(app, {tree: T.unfocus(app.tree)}));
      }
    },
    [updateApp],
  );

  const topBarProps = useTopBarProps({
    app,
    updateApp,
    send: receiver.send,
    isToolbarShown,
    setIsToolbarShown,
    username,
    server,
    search: (query) => search.query(query, 25),
  });

  const onItemEvent = useOnItemEvent({updateApp, openExternalUrl: openExternalUrl, send: receiver.send});

  const onToolbarButtonPressed = React.useCallback((action) => receiver.send("action", {action}), [receiver]);

  return (
    <div ref={appElementRef} id="app" spellCheck={false} onFocus={onFocusApp} tabIndex={-1} className="app">
      {<OfflineIndicator isDisconnected={A.isDisconnected(app)} />}
      <div className="app-header">
        <TopBar {...topBarProps} />
        {isToolbarShown ? (
          <Toolbar.Toolbar onToolbarButtonPressed={onToolbarButtonPressed} toolbar={Toolbar.toolbar(app)} />
        ) : null}
      </div>
      {!showSplash && (
        <Tutorial.TutorialBox
          state={app.tutorialState}
          setState={(tutorialState) => updateApp((app) => A.merge(app, {tutorialState}))}
        />
      )}
      <Changelog
        changelog={changelog}
        visible={app.changelogShown}
        hide={() => updateApp((app) => A.merge(app, {changelogShown: false}))}
      />
      {app.tab === "orphans" ? (
        <OrphanList {...useOrphanListProps(app, updateApp)} />
      ) : (
        <Outline.Outline outline={Outline.fromApp(app)} onItemEvent={onItemEvent} />
      )}
      {showSplash && ReactDOM.createPortal(<Splash splashCompleted={() => setShowSplash(false)} />, document.body)}
    </div>
  );
}

function useOnItemEvent({
  updateApp,
  openExternalUrl,
  send,
}: {
  updateApp(f: (app: A.App) => A.App): void;
  openExternalUrl(url: string): void;
  send: Receiver<Message>["send"];
}) {
  return React.useCallback((event: Item.ItemEvent) => {
    const node = (event: {id: number}): T.NodeRef => ({id: event.id});

    if (event.type === "drag") {
      updateApp((app) => A.merge(app, {drag: Drag.drag(app.tree, node(event))}));
    } else if (event.type === "click-bullet") {
      updateApp((app) => (event.alt ? Item.altClick : Item.click)(app, node(event)));
    } else if (event.type === "click-parent") {
      updateApp((app) => A.jump(app, event.thing));
    } else if (event.type === "click-placeholder") {
      updateApp(PlaceholderItem.create);
    } else if (event.type === "toggle-references") {
      updateApp((app) => A.merge(app, {tree: T.toggleBackreferences(app.state, app.tree, node(event))}));
    } else if (event.type === "edit") {
      updateApp((app) => {
        const result = Editor.handling(app, node(event))(event.event);
        if (result.effects?.url) openExternalUrl(result.effects.url);
        if (result.effects?.search) send("search", {search: result.effects.search});
        return result.app;
      });
    } else if (event.type === "unfold") {
      updateApp((app) => A.unfold(app, node(event)));
    } else {
      const unreachable: never = event;
      console.error("Unknown item event type: %o", unreachable);
    }
  }, []);
}

// ==

export function LocalApp(props: {
  storage: Storage.Storage;
  ExternalLink: ExternalLinkType;
  openExternalUrl: (url: string) => void;
}) {
  const [app, setApp] = React.useState<JSX.Element>(<div>Loading...</div>);

  React.useEffect(() => {
    (async () => {
      setApp(
        <ExternalLinkProvider value={props.ExternalLink}>
          <App_
            storedState={await Sync.loadStoredStateFromStorage(props.storage)}
            storage={props.storage}
            openExternalUrl={props.openExternalUrl}
          />
        </ExternalLinkProvider>,
      );
    })();
  }, []);

  return app;
}

export function App({apiHost}: {apiHost: string}) {
  const server = new ServerApi({apiHost});

  const [app, setApp] = React.useState<JSX.Element>(<div>Loading...</div>);

  React.useEffect(() => {
    (async () => {
      const username = await server.getUsername();
      if (username === null) {
        console.log("Not logged in. Redirecting to login page.");
        window.location.href = "/login.html";
      }

      const storage = Storage.server(server);

      setApp(
        <App_
          storedState={await Sync.loadStoredStateFromStorage(storage)}
          username={username ?? "<error>"}
          storage={storage}
          server={server}
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
          storedState={await Sync.loadStoredStateFromStorage(Storage.ignore(props.data))}
          storage={Storage.ignore()}
          openExternalUrl={(url) => window.open(url, "_blank")}
        />,
      );
    })();
  }, []);

  return app;
}

export function User(props: {apiHost: string}) {
  return <UserPage server={new ServerApi({apiHost: props.apiHost})} />;
}

export * as Storage from "./sync/storage";
export {Communication} from "@thinktool/shared";
