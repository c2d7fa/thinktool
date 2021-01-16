import {Communication} from "@thinktool/shared";
import * as Misc from "@johv/miscjs";

import * as ChangelogData from "./changes.json";

import {State, diffState} from "./data";
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

import * as Editor from "./ui/Editor";
import {usePopup} from "./ui/ThingSelectPopup";
import Toolbar from "./ui/Toolbar";
import Changelog from "./ui/Changelog";
import Splash from "./ui/Splash";
import {ExternalLinkProvider, ExternalLink, ExternalLinkType} from "./ui/ExternalLink";
import Bullet from "./ui/Bullet";
import * as Item from "./ui/Item";
import UserPage from "./ui/UserPage";
import * as PlaceholderItem from "./ui/PlaceholderItem";

import * as React from "react";
import * as ReactDOM from "react-dom";

import {Receiver, receiver as createReceiver} from "./receiver";
import {Message} from "./messages";
import {EditorState} from "prosemirror-state";

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
  const [innerApp, setInnerApp] = React.useState<A.App>(
    A.from(initialState, T.fromRoot(initialState, extractThingFromURL()), {
      tutorialFinished: initialTutorialFinished,
    }),
  );
  const [drag, setDrag] = React.useState({current: null, target: null} as DragInfo);

  const batched = useBatched(200);

  const context: Context = {
    setApp(app: A.App) {
      // Push changes to server
      const diff = diffState(innerApp.state, app.state);
      for (const thing of diff.deleted) {
        storage.deleteThing(thing);
      }
      for (const thing of diff.changedContent) {
        batched.update(thing, () => {
          storage.setContent(thing, Data.content(app.state, thing));
        });
      }
      if (diff.added.length !== 0 || diff.changed.length !== 0) {
        storage.updateThings(
          [...diff.added, ...diff.changed].map((thing) => ({
            name: thing,
            content: Data.content(app.state, thing),
            children: Data.childConnections(app.state, thing).map((c) => {
              return {
                name: c.connectionId,
                child: Data.connectionChild(app.state, c)!,
              };
            }),
            isPage: Data.isPage(app.state, thing),
          })),
        );
      }

      if (!Tutorial.isActive(app.tutorialState)) {
        storage.setTutorialFinished();
      }

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
    setLocalState(state) {
      setInnerApp((innerApp) => A.merge(innerApp, {state}));
    },

    // [TODO] Do we actually need this?
    updateLocalState(update) {
      setInnerApp((innerApp) => {
        const state = update(innerApp.state);
        const tree = T.refresh(innerApp.tree, state);
        return A.merge(innerApp, {state, tree});
      });
    },

    drag,
    setDrag,

    changelog: ChangelogData,
    storage,
    server,
    openExternalUrl,
    send: receiver.send,

    setTutorialState(tutorialState) {
      context.setApp(A.merge(context, {tutorialState}));
    },

    setChangelogShown(changelogShown) {
      context.setApp(A.merge(context, {changelogShown}));
    },

    setTree(tree) {
      context.setApp(A.merge(context, {tree}));
    },

    setState(state) {
      context.setApp(A.merge(context, {state}));
    },

    setEditors(editors) {
      context.setApp(A.merge(context, editors));
    },
  };

  useThingUrl({
    current: T.thing(context.tree, T.root(context.tree)),
    jump(thing: string) {
      context.setTree(T.fromRoot(context.state, thing));
    },
  });

  return context;
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
  const receiver = React.useRef(createReceiver<Message>());

  React.useEffect(() => {
    receiver.current.subscribe("action", async (ev) => {
      setAppState(
        contextRef.current,
        await Actions.execute(contextRef.current, ev.action, {
          input: popup.input,
          openUrl: context.openExternalUrl,
        }),
      );
    });

    receiver.current.subscribe("toolbar", (ev) => {
      Actions.executeOn(contextRef.current, ev.button, ev.target, {input: popup.input});
    });
  }, []);

  const send = receiver.current.send;

  const context = useContext({
    initialState,
    initialTutorialFinished,
    storage,
    server,
    openExternalUrl,
    receiver: receiver.current,
  });

  const popup = usePopup(context);

  const contextRef = React.useRef(context);
  React.useEffect(() => {
    contextRef.current = context;
  }, [context]);

  // If the same user is connected through multiple clients, we want to be able
  // to see changes from other clients on this one.
  //
  // The server makes a websocket available on /api/changes, which notifies us
  // when there are pending changes from another client.

  // [TODO] Theoretically, this should be rerun when context.updateLocalState
  // changes, but for some reason just putting context.updateLocalState in the
  // dependencies makes it reconnect every time any change is made to the state
  // (e.g. editing the content of an item).
  React.useEffect(() => {
    if (context.server === undefined) return;

    return context.server.onChanges(async (changes) => {
      for (const changedThing of changes) {
        const thingData = await context.server!.getThingData(changedThing);

        if (thingData === null) {
          // Thing was deleted
          context.updateLocalState((state) => Data.remove(state, changedThing));
          continue;
        }

        context.updateLocalState((state) => {
          let newState = state;

          if (!Data.exists(newState, changedThing)) {
            // A new item was created
            newState = Data.create(newState, changedThing)[0];
          }

          newState = Data.setContent(newState, changedThing, thingData.content);

          if (Data.isPage(newState, changedThing) !== thingData.isPage) {
            newState = Data.togglePage(newState, changedThing);
          }

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

  document.onkeydown = (ev) => {
    if (Sh.matches(ev, Actions.shortcut("undo"))) {
      context.send("action", {action: "undo"});
      ev.preventDefault();
    } else if (Sh.matches(ev, Actions.shortcut("find"))) {
      context.send("action", {action: "find"});
      ev.preventDefault();
    }
  };

  React.useEffect(() => {
    if (context.drag.current === null) return;

    function mousemove(ev: MouseEvent): void {
      const [x, y] = [ev.clientX, ev.clientY];

      let element: HTMLElement | null | undefined = document.elementFromPoint(x, y) as HTMLElement;
      while (element && !element.classList.contains("item")) {
        element = element?.parentElement;
      }

      if (element != null) {
        const targetId = +element.dataset.id!;
        if (targetId !== context.drag.target?.id)
          context.setDrag({current: context.drag.current, target: {id: targetId}, finished: false});
      }
    }

    function touchmove(ev: TouchEvent): void {
      const [x, y] = [ev.changedTouches[0].clientX, ev.changedTouches[0].clientY];

      let element: HTMLElement | null | undefined = document.elementFromPoint(x, y) as HTMLElement;
      while (element && !element.classList.contains("item")) {
        element = element?.parentElement;
      }

      if (element != null) {
        const targetId = +element.dataset.id!;
        if (targetId !== context.drag.target?.id)
          context.setDrag({current: context.drag.current, target: {id: targetId}, finished: false});
      }
    }

    window.addEventListener("mousemove", mousemove);
    window.addEventListener("touchmove", touchmove);

    function mouseup(ev: MouseEvent | TouchEvent): void {
      context.setDrag({...context.drag, finished: ev.ctrlKey ? "copy" : true});
    }

    window.addEventListener("mouseup", mouseup);
    window.addEventListener("touchend", mouseup);

    return () => {
      window.removeEventListener("mousemove", mousemove);
      window.removeEventListener("touchmove", touchmove);
      window.removeEventListener("mouseup", mouseup);
      window.removeEventListener("touchend", mouseup);
    };
  }, [context.drag]);

  React.useEffect(() => {
    if (context.drag.finished) {
      if (context.drag.current !== null && context.drag.target !== null && context.drag.current.id !== null) {
        if (context.drag.finished === "copy") {
          const [newState, newTree, newId] = T.copyToAbove(
            context.state,
            context.tree,
            context.drag.current,
            context.drag.target,
          );
          context.setState(newState);
          context.setTree(T.focus(newTree, newId));
        } else {
          const [newState, newTree] = T.moveToAbove(
            context.state,
            context.tree,
            context.drag.current,
            context.drag.target,
          );
          context.setState(newState);
          context.setTree(newTree);
        }
      }

      context.setDrag({current: null, target: null, finished: false});
    }
  }, [context.drag]);

  const [toolbarShown, setToolbarShown] = React.useState<boolean>(true);

  const appRef = React.useRef<HTMLDivElement>(null);

  const [showSplash, setShowSplash] = React.useState<boolean>(Tutorial.isActive(context.tutorialState));

  return (
    <div
      ref={appRef}
      id="app"
      spellCheck={false}
      onFocus={(ev) => {
        if (ev.target === appRef.current) {
          console.log("Unfocusing item due to click on background");
          context.setTree(T.unfocus(context.tree));
        }
      }}
      tabIndex={-1}
      className="app"
    >
      {popup.component}
      <div className="top-bar">
        <ExternalLink className="logo" href="/">
          Thinktool
        </ExternalLink>
        <button onClick={() => setToolbarShown(!toolbarShown)}>
          <i className="icon fas fa-bars" />
          {toolbarShown ? "Hide" : "Show"} Menu
        </button>
        <div id="current-user">
          {username && (
            <ExternalLink className="username" href="/user.html">
              {username}
            </ExternalLink>
          )}
          {context.server && (
            <a className="log-out" href={context.server.logOutUrl}>
              Log Out
            </a>
          )}
        </div>
      </div>
      {toolbarShown ? (
        <Toolbar
          executeAction={(action) => send("toolbar", {button: action, target: T.focused(context.tree)})}
          isEnabled={(action) => Actions.enabled(context, action)}
          isRelevant={(action) => Tutorial.isRelevant(context.tutorialState, action)}
          isNotIntroduced={(action) => Tutorial.isNotIntroduced(context.tutorialState, action)}
        />
      ) : null}
      {!showSplash && <Tutorial.TutorialBox state={context.tutorialState} setState={context.setTutorialState} />}
      <Changelog
        changelog={context.changelog}
        visible={context.changelogShown}
        hide={() => context.setChangelogShown(false)}
      />
      <ThingOverview context={context} />
      {showSplash && ReactDOM.createPortal(<Splash splashCompleted={() => setShowSplash(false)} />, document.body)}
    </div>
  );
}

function ThingOverview(p: {context: Context}) {
  const hasReferences =
    Data.backreferences(p.context.state, T.thing(p.context.tree, T.root(p.context.tree))).length > 0;

  return (
    <div className="overview">
      <ParentsOutline context={p.context} />
      <div className="overview-main">
        <Editor.Editor
          editor={A.editor(p.context, T.root(p.context.tree))!}
          hasFocus={T.hasFocus(p.context.tree, T.root(p.context.tree))}
          onEvent={handlingEditorEvent(p.context, T.root(p.context.tree))}
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
}

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
  return (
    <Subtree context={p.context} parent={T.root(p.context.tree)} omitReferences={true}>
      {PlaceholderItem.isVisible(p.context) && (
        <PlaceholderItem.PlaceholderItem
          onCreate={() => setAppState(p.context, PlaceholderItem.create(p.context))}
        />
      )}
    </Subtree>
  );
}

const handlingEditorEvent = (context: Context, node: T.NodeRef) => (event: Editor.Event): void => {
  const result = Editor.handling(context, node)(event);

  if (result.handled) {
    setAppState(context, result.app);
  } else if (event.tag === "action") {
    context.send("action", {action: event.action});
  } else if (event.tag === "openUrl") {
    context.openExternalUrl(event.url);
  } else {
    console.error("Unhandled event from editor: %o", event);
  }
};

function ExpandableItem(props: {context: Context; node: T.NodeRef; parent?: T.NodeRef}) {
  function OtherParentsSmall(props: {context: Context; child: T.NodeRef; parent?: T.NodeRef}) {
    const otherParents = Data.otherParents(
      props.context.state,
      T.thing(props.context.tree, props.child),
      props.parent && T.thing(props.context.tree, props.parent),
    );

    const listItems = otherParents.map((otherParentThing, index) => {
      return (
        <li key={index}>
          <span
            className="other-parent-small"
            onClick={() => {
              setAppState(props.context, A.jump(props.context, otherParentThing));
            }}
            title={Data.contentText(props.context.state, otherParentThing)}
          >
            <Bullet specialType="parent" beginDrag={() => {}} status="collapsed" toggle={() => {}} />
            &nbsp;
            {Misc.truncateEllipsis(Data.contentText(props.context.state, otherParentThing), 30)}
          </span>
        </li>
      );
    });

    return <ul className="other-parents-small">{listItems}</ul>;
  }

  function beginDrag() {
    props.context.setDrag({current: props.node, target: null, finished: false});
  }

  const otherParents = <OtherParentsSmall context={props.context} child={props.node} parent={props.parent} />;

  const subtree = <Subtree context={props.context} parent={props.node} grandparent={props.parent} />;

  const content = (
    <Editor.Editor
      editor={A.editor(props.context, props.node)!}
      hasFocus={T.hasFocus(props.context.tree, props.node)}
      onEvent={handlingEditorEvent(props.context, props.node)}
    />
  );

  return (
    <Item.Item
      dragState={Item.dragState(props.context.drag, props.node)}
      status={Item.status(props.context.tree, props.node)}
      onBulletClick={() => setAppState(props.context, Item.click(props.context, props.node))}
      onBulletAltClick={() => setAppState(props.context, Item.altClick(props.context, props.node))}
      id={props.node.id}
      beginDrag={beginDrag}
      kind={Item.kind(props.context.tree, props.node)}
      otherParents={otherParents}
      subtree={subtree}
      content={content}
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

  return (
    <>
      <li className="item">
        <div>
          <button
            onClick={() => p.context.setTree(T.toggleBackreferences(p.context.state, p.context.tree, p.parent))}
            className="backreferences-text"
          >
            {backreferences.length} References
            {!T.backreferencesExpanded(p.context.tree, p.parent) && "..."}
          </button>
        </div>
      </li>
      {T.backreferencesExpanded(p.context.tree, p.parent) && children}
    </>
  );
}

function Subtree(p: {
  context: Context;
  parent: T.NodeRef;
  grandparent?: T.NodeRef;
  children?: React.ReactNode[] | React.ReactNode;
  omitReferences?: boolean;
}) {
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
      {p.children}
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
