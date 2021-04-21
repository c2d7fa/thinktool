import "../app.scss";

import {Communication} from "@thinktool/shared";

import * as ChangelogData from "./changes.json";

import {State} from "./data";
import {Context, DragInfo, setAppState} from "./context";
import {extractThingFromURL, useThingUrl} from "./url";
import {useBatched} from "./batched";

import * as Data from "./data";
import * as T from "./tree";
import * as Tutorial from "./tutorial";
import * as API from "./server-api";
import * as Storage from "./storage";
import * as Actions from "./actions";
import * as Sh from "./shortcuts";
import * as A from "./app";
import * as Drag from "./drag";
import * as P from "./popup";

import * as Editor from "./ui/Editor";
import {usePopup} from "./popup/Popup";
import Toolbar from "./ui/Toolbar";
import Changelog from "./ui/Changelog";
import Splash from "./ui/Splash";
import {ExternalLinkProvider, ExternalLink, ExternalLinkType} from "./ui/ExternalLink";
import * as Item from "./ui/Item";
import UserPage from "./ui/UserPage";
import * as PlaceholderItem from "./ui/PlaceholderItem";
import {OtherParents, useOtherParents} from "./ui/OtherParents";
import {TopBar, useTopBarProps} from "./ui/TopBar";

import * as React from "react";
import * as ReactDOM from "react-dom";

import {Receiver, receiver as createReceiver} from "./receiver";
import {Message} from "./messages";
import {usePropRef} from "./react-utils";
import * as SelectedItem from "./ui/SelectedItem";
import {OrphanList, useOrphanListProps} from "./orphans/ui";
import {Search} from "@thinktool/search";

function useContext({
  initialState,
  initialTutorialFinished,
  storage,
  server,
  openExternalUrl,
  receiver,
}: {
  initialState: State;
  initialTutorialFinished: boolean;
  storage: Storage.Storage;
  server?: API.Server;
  openExternalUrl(url: string): void;
  receiver: Receiver<Message>;
}): Context {
  const [innerApp, setInnerApp] = React.useState<A.App>(() =>
    A.from(initialState, T.fromRoot(initialState, extractThingFromURL()), {
      tutorialFinished: initialTutorialFinished,
    }),
  );

  const batched = useBatched(200);

  const context: Context = {
    ...innerApp,

    setApp(app: A.App) {
      // Push changes to server
      const effects = Storage.Diff.effects(innerApp, app);
      Storage.execute(storage, effects, {
        setContent(thing, content) {
          batched.update(thing, () => {
            storage.setContent(thing, content);
          });
        },
      });

      // Update actual app
      setInnerApp(app);
    },

    get state() {
      return innerApp.state;
    },
    get tree() {
      return innerApp.tree;
    },
    get tutorialState() {
      return innerApp.tutorialState;
    },
    get changelogShown() {
      return innerApp.changelogShown;
    },
    get editors() {
      return innerApp.editors;
    },

    // [TODO] Do we actually need this?
    updateLocalState(update) {
      setInnerApp((innerApp) => {
        const state = update(innerApp.state);
        const tree = T.refresh(innerApp.tree, state);
        return A.merge(innerApp, {state, tree});
      });
    },

    changelog: ChangelogData,
    storage,
    server,
    openExternalUrl,
    send: receiver.send,
  };

  useThingUrl({
    current: T.thing(context.tree, T.root(context.tree)),
    jump(thing: string) {
      setInnerApp(A.merge(context, {tree: T.fromRoot(context.state, thing)}));
    },
  });

  return context;
}

function useGlobalShortcuts(sendEvent: Context["send"]) {
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

function useServerChanges(server: API.Server | null, update: (f: (state: Data.State) => Data.State) => void) {
  React.useEffect(() => {
    if (server === null) return;

    return server.onChanges(async (changes) => {
      for (const changedThing of changes) {
        const thingData = await server.getThingData(changedThing);

        if (thingData === null) {
          // Thing was deleted
          update((state) => Data.remove(state, changedThing));
          continue;
        }

        update((state) => {
          let newState = state;

          if (!Data.exists(newState, changedThing)) {
            // A new item was created
            newState = Data.create(newState, changedThing)[0];
          }

          newState = Data.setContent(newState, changedThing, thingData.content);

          const nChildren = Data.children(newState, changedThing).length;
          for (let i = 0; i < nChildren; ++i) {
            newState = Data.removeChild(newState, changedThing, 0);
          }
          for (const childConnection of thingData.children) {
            newState = Data.addChild(newState, changedThing, childConnection.child, childConnection.name)[0];
          }

          return newState;
        });
      }
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
  initialState,
  initialTutorialFinished,
  username,
  storage,
  server,
  openExternalUrl,
}: {
  initialState: State;
  initialTutorialFinished: boolean;
  username?: string;
  storage: Storage.Storage;
  server?: API.Server;
  openExternalUrl(url: string): void;
}) {
  const isDevelopment = React.useMemo(() => window.location.hostname === "localhost", []);

  const receiver = React.useMemo(() => createReceiver<Message>(), []);
  const context = useContext({
    initialState,
    initialTutorialFinished: isDevelopment || initialTutorialFinished,
    storage,
    server,
    openExternalUrl,
    receiver,
  });

  const updateApp = useUpdateApp(context);

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

  const popup = usePopup(context, updateApp, (query) => search.query(query, 25));

  React.useEffect(() => {
    receiver.subscribe("action", (ev) => {
      updateApp((app) => {
        const result = Actions.update(app, ev.action);
        if (result.undo) console.warn("Undo isn't currently supported.");
        if (result.url) context.openExternalUrl(result.url);
        if (result.search) receiver.send("search", {search: result.search});
        return result.app;
      });
    });

    receiver.subscribe("search", (ev) => {
      search.reset(ev.search.items);
      search.query(ev.search.query, 25);
    });
  }, []);

  useServerChanges(server ?? null, context.updateLocalState);
  useGlobalShortcuts(receiver.send);

  useDragAndDrop(context, updateApp);

  const [isToolbarShown, setIsToolbarShown] = React.useState<boolean>(true);

  const appRef = React.useRef<HTMLDivElement>(null);

  const [showSplash, setShowSplash] = React.useState<boolean>(
    !isDevelopment && Tutorial.isActive(context.tutorialState),
  );

  const onFocusApp = React.useCallback(
    (ev: React.FocusEvent) => {
      if (ev.target === appRef.current) {
        console.log("Unfocusing item due to click on background");
        updateApp((app) => A.merge(app, {tree: T.unfocus(app.tree)}));
      }
    },
    [updateApp],
  );

  const topBarProps = useTopBarProps(context, {isToolbarShown, setIsToolbarShown, username});

  return (
    <div ref={appRef} id="app" spellCheck={false} onFocus={onFocusApp} tabIndex={-1} className="app">
      {popup}
      <TopBar {...topBarProps} />
      {isToolbarShown ? (
        <Toolbar
          executeAction={(action) => receiver.send("action", {action})}
          isEnabled={(action) => Actions.enabled(context, action)}
          isRelevant={(action) => Tutorial.isRelevant(context.tutorialState, action)}
          isNotIntroduced={(action) => Tutorial.isNotIntroduced(context.tutorialState, action)}
        />
      ) : null}
      {!showSplash && (
        <Tutorial.TutorialBox
          state={context.tutorialState}
          setState={(tutorialState) => setAppState(context, A.merge(context, {tutorialState}))}
        />
      )}
      <Changelog
        changelog={context.changelog}
        visible={context.changelogShown}
        hide={() => setAppState(context, A.merge(context, {changelogShown: false}))}
      />
      {context.tab === "orphans" ? (
        <OrphanList {...useOrphanListProps(context, updateApp)} />
      ) : (
        <ThingOverview context={context} />
      )}
      {showSplash && ReactDOM.createPortal(<Splash splashCompleted={() => setShowSplash(false)} />, document.body)}
    </div>
  );
}

const ThingOverview = React.memo(
  function (p: {context: Context}) {
    const node = T.root(p.context.tree);

    const hasReferences = Data.backreferences(p.context.state, T.thing(p.context.tree, node)).length > 0;

    const onEditEvent = useOnEditEvent(p.context, node);

    return (
      <div className="overview">
        <ParentsOutline context={p.context} />
        <div className="overview-main">
          <SelectedItem.SelectedItem
            onEditEvent={onEditEvent}
            {...SelectedItem.useUnfold(p.context, useUpdateApp(p.context))}
            {...Editor.forNode(p.context, node)}
          />
          <div className="children">
            <Outline context={p.context} />
          </div>
        </div>
        {hasReferences && (
          <>
            <div className="references">
              <h1 className="link-section">References</h1>
              <ReferencesOutline context={p.context} />
            </div>
          </>
        )}
      </div>
    );
  },
  (prev, next) => {
    // When the popup is open, we know that the outline view won't change.
    return P.isOpen(prev.context.popup) && P.isOpen(next.context.popup);
  },
);

// TODO: ParentsOutline and ReferencesOutline should both have appropriate
// custom behavior in response to key-presses (e.g. Alt+Backspace in
// ParentsOutline should remove parent from child).

function ParentsOutline(p: {context: Context}) {
  const parentItems = T.otherParentsChildren(p.context.tree, T.root(p.context.tree)).map((child: T.NodeRef) => {
    return <ExpandableItem key={child.id} node={child} context={p.context} />;
  });

  const subtree = <ul className="subtree">{parentItems}</ul>;

  if (parentItems.length === 0) {
    return null;
  } else {
    return (
      <div className="parents">
        <h1 className="link-section">Parents</h1>
        {subtree}
      </div>
    );
  }
}

function ReferencesOutline(p: {context: Context}) {
  const referenceItems = T.backreferencesChildren(p.context.tree, T.root(p.context.tree)).map(
    (child: T.NodeRef) => {
      return <ExpandableItem key={child.id} node={child} context={p.context} />;
    },
  );

  if (referenceItems.length === 0) {
    return null;
  } else {
    return <ul className="subtree">{referenceItems}</ul>;
  }
}

function Outline(p: {context: Context}) {
  return <Subtree context={p.context} parent={T.root(p.context.tree)} omitReferences={true} />;
}

function handleEditorEvent(context: Context, node: T.NodeRef, event: Editor.Event) {
  const result = Editor.handling(context, node)(event);

  setAppState(context, result.app);

  if (result.effects?.url) context.openExternalUrl(result.effects.url);
  if (result.effects?.search) context.send("search", {search: result.effects.search});
}

function useOnEditEvent(context: Context, node: T.NodeRef): (ev: Editor.Event) => void {
  // We don't want to update all editors each time context changes. Editor will
  // not update if none of its props have changed. To ensure that this condition
  // is met, we always pass the same callback.
  const contextRef = usePropRef(context);
  return React.useCallback((ev: Editor.Event) => handleEditorEvent(contextRef.current!, node, ev), [node]);
}

function useUpdateApp(context: Context): (f: (app: A.App) => A.App) => void {
  // Speculative optimization. I haven't tested the impact of this.
  const contextRef = usePropRef(context);
  const updateApp = React.useMemo(
    () => (f: (app: A.App) => A.App) => setAppState(contextRef.current!, f(contextRef.current!)),
    [],
  );
  return updateApp;
}

function useBulletProps(node: T.NodeRef, updateApp: ReturnType<typeof useUpdateApp>) {
  const beginDrag = React.useCallback(() => updateApp((app) => A.merge(app, {drag: Drag.drag(app.tree, node)})), [
    node,
  ]);
  const onBulletClick = React.useCallback(() => updateApp((app) => Item.click(app, node)), [node]);
  const onBulletAltClick = React.useCallback(() => updateApp((app) => Item.altClick(app, node)), [node]);
  return {beginDrag, onBulletClick, onBulletAltClick};
}

function ExpandableItem(props: {context: Context; node: T.NodeRef; parent?: T.NodeRef}) {
  const updateApp = useUpdateApp(props.context);

  const {otherParents, click: onOtherParentClick, altClick: onOtherParentAltClick} = useOtherParents({
    app: props.context,
    updateApp,
    node: props.node,
    parent: props.parent,
  });

  const bulletProps = useBulletProps(props.node, updateApp);

  const subtree = <Subtree context={props.context} parent={props.node} grandparent={props.parent} />;

  const onEditEvent = useOnEditEvent(props.context, props.node);
  const editorProps = {...Editor.forNode(props.context, props.node), onEditEvent};

  return (
    <Item.Item
      dragState={Drag.node(props.context.drag, props.node)}
      status={Item.status(props.context.tree, props.node)}
      id={props.node.id}
      kind={Item.kind(props.context.tree, props.node)}
      {...{otherParents, onOtherParentClick, onOtherParentAltClick}}
      subtree={subtree}
      {...bulletProps}
      {...editorProps}
    />
  );
}

function BackreferencesItem(p: {context: Context; parent: T.NodeRef}) {
  const backreferences = Data.backreferences(p.context.state, T.thing(p.context.tree, p.parent));

  if (backreferences.length === 0) {
    return null;
  }

  const children = T.backreferencesChildren(p.context.tree, p.parent).map((child) => {
    return <ExpandableItem key={child.id} node={child} context={p.context} />;
  });

  const updateApp = useUpdateApp(p.context);

  const toggle = React.useCallback(
    () => updateApp((app) => A.merge(app, {tree: T.toggleBackreferences(app.state, app.tree, p.parent)})),
    [p.parent],
  );

  return (
    <>
      <li className="item">
        <div>
          <button onClick={toggle} className="backreferences-text">
            {backreferences.length} References
            {!T.backreferencesExpanded(p.context.tree, p.parent) && "..."}
          </button>
        </div>
      </li>
      {T.backreferencesExpanded(p.context.tree, p.parent) && children}
    </>
  );
}

function Subtree(p: {context: Context; parent: T.NodeRef; grandparent?: T.NodeRef; omitReferences?: boolean}) {
  const children = T.children(p.context.tree, p.parent).map((child) => {
    return <ExpandableItem key={child.id} node={child} parent={p.parent} context={p.context} />;
  });

  const openedLinksChildren = T.openedLinksChildren(p.context.tree, p.parent).map((child) => {
    return <ExpandableItem key={child.id} node={child} parent={p.parent} context={p.context} />;
  });

  return (
    <ul className="subtree">
      {openedLinksChildren}
      {children}
      {PlaceholderItem.isVisible(p.context) && (
        <PlaceholderItem.PlaceholderItem
          onCreate={() => setAppState(p.context, PlaceholderItem.create(p.context))}
        />
      )}
      {!p.omitReferences && <BackreferencesItem key="backreferences" parent={p.parent} context={p.context} />}
    </ul>
  );
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
            initialState={API.transformFullStateResponseIntoState(await props.storage.getFullState())}
            initialTutorialFinished={await props.storage.getTutorialFinished()}
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
  const server = API.initialize(apiHost);

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
          initialState={API.transformFullStateResponseIntoState(await storage.getFullState())}
          initialTutorialFinished={await storage.getTutorialFinished()}
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
  return (
    <App_
      initialState={API.transformFullStateResponseIntoState(props.data)}
      initialTutorialFinished={false}
      storage={Storage.ignore()}
      openExternalUrl={(url) => window.open(url, "_blank")}
    />
  );
}

export function User(props: {apiHost: string}) {
  return <UserPage server={API.initialize(props.apiHost)} />;
}

export * as Storage from "./storage";
export {Communication} from "@thinktool/shared";
