import {Communication} from "@thinktool/shared";
import * as Misc from "@johv/miscjs";

import * as ChangelogData from "./changes.json";

import {State} from "./data";
import {Context, DragInfo} from "./context";

import * as Data from "./data";
import * as T from "./tree";
import * as Tutorial from "./tutorial";
import * as API from "./server-api";
import * as Storage from "./storage";
import * as Actions from "./actions";
import * as ExportRoam from "./export-roam";
import * as Sh from "./shortcuts";
import * as Editing from "./editing";

import Editor from "./ui/Editor";
import ThingSelectPopup from "./ui/ThingSelectPopup";
import Toolbar from "./ui/Toolbar";
import Changelog from "./ui/Changelog";
import Splash from "./ui/Splash";
import {ExternalLinkProvider, ExternalLink, ExternalLinkType} from "./ui/ExternalLink";
import Bullet from "./ui/Bullet";

import * as React from "react";
import * as ReactDOM from "react-dom";

import undo from "./undo";

import {classes} from "./util";

// ==

// [TODO] Move this to utility library
function truncateEllipsis(text: string, maxLength: number) {
  if (text.length >= maxLength) {
    return text.substr(0, maxLength - 3) + "...";
  } else {
    return text;
  }
}

// == Components ==

function extractThingFromURL(): string {
  if (window.location.hash.length > 0) {
    const thing = window.location.hash.slice(1);
    return thing;
  } else {
    // By default, use thing #0. We should probably do something smarter here,
    // like allow the user to set a deafult thing.
    return "0";
  }
}

// If we notified the server every time the user took an action, we would
// overload the server with a huge number of requests. Instead we "batch"
// changes, and only send the data when it makes sense to do so.
//
// We only want to batch related actions. For example if the user creates a new
// item and then starts editing its title, the creation of the new item should
// be sent immediately, but the editing should be batched such that we don't
// send a request for each keystroke.

function useBatched(cooldown: number): {update(key: string, callback: () => void): void} {
  const timeouts: React.MutableRefObject<{[key: string]: number}> = React.useRef({});
  const callbacks: React.MutableRefObject<{[key: string]: () => void}> = React.useRef({});

  function update(key: string, callback: () => void): void {
    if (timeouts.current[key] !== undefined) {
      clearTimeout(timeouts.current[key]);
      delete timeouts.current[key];
    }
    callbacks.current[key] = callback;
    timeouts.current[key] = window.setTimeout(() => {
      callback();
      delete callbacks.current[key];
    }, cooldown);
  }

  window.onbeforeunload = () => {
    for (const key in callbacks.current) {
      callbacks.current[key]();
    }
  };

  return {update};
}

// When the user does something, we need to update both the local state and the
// state on the server. We can't just send over the entire state to the server
// each time; instead we use a REST API to make small changes.
//
// However, when we use library functions like Tree.moveToAbove (for example),
// we just get back the new state, not each of the steps needed to bring the old
// state to the new state. In this case, we have to go through and
// retrospectively calculate the changes that we need to send to the server.
//
// In theory, we would prefer to write our code such that we always know exactly
// what to send to the server. In practice, we use diffState quite frequently.

function diffState(
  oldState: State,
  newState: State,
): {added: string[]; deleted: string[]; changed: string[]; changedContent: string[]} {
  const added: string[] = [];
  const deleted: string[] = [];
  const changed: string[] = [];
  const changedContent: string[] = [];

  for (const thing in oldState.things) {
    if (oldState.things[thing] !== newState.things[thing]) {
      if (newState.things[thing] === undefined) {
        deleted.push(thing);
      } else if (JSON.stringify(oldState.things[thing]) !== JSON.stringify(newState.things[thing])) {
        if (
          // [TODO] Can we get better typechecking here?
          JSON.stringify(Misc.removeKey(oldState.things[thing] as any, "content")) ===
          JSON.stringify(Misc.removeKey(newState.things[thing] as any, "content"))
        ) {
          changedContent.push(thing);
        } else {
          changed.push(thing);
        }
      }
    } else {
      for (const connection of Data.childConnections(oldState, thing)) {
        if (oldState.connections[connection.connectionId] !== newState.connections[connection.connectionId]) {
          changed.push(thing);
        }
      }
    }
  }

  for (const thing in newState.things) {
    if (oldState.things[thing] === undefined) {
      added.push(thing);
    }
  }

  return {added, deleted, changed, changedContent};
}

function useContext({
  initialState,
  initialTutorialFinished,
  storage,
  server,
}: {
  initialState: State;
  initialTutorialFinished: boolean;
  storage: Storage.Storage;
  server?: API.Server;
}): Context {
  const [state, setLocalState] = React.useState(initialState);

  const batched = useBatched(200);

  function setState(newState: State): void {
    if (newState !== state) {
      undo.pushState(state);
      setLocalState(newState);

      const diff = diffState(state, newState);
      for (const thing of diff.deleted) {
        storage.deleteThing(thing);
      }
      for (const thing of diff.changedContent) {
        batched.update(thing, () => {
          storage.setContent(thing, Data.content(newState, thing));
        });
      }
      if (diff.added.length !== 0 || diff.changed.length !== 0) {
        storage.updateThings(
          [...diff.added, ...diff.changed].map((thing) => ({
            name: thing,
            content: Data.content(newState, thing),
            children: Data.childConnections(newState, thing).map((c) => {
              return {
                name: c.connectionId,
                child: Data.connectionChild(newState, c)!,
              };
            }),
            isPage: Data.isPage(newState, thing),
          })),
        );
      }
    }
  }

  function undo_(): void {
    const oldState = undo.popState();
    if (oldState === null) {
      console.log("Can't undo further");
      return;
    }
    setLocalState(oldState);
    // TODO: Code duplication, see setState above
    const diff = diffState(state, oldState);
    for (const thing of diff.deleted) {
      storage.deleteThing(thing);
    }
    storage.updateThings(
      [...diff.added, ...diff.changed].map((thing) => ({
        name: thing,
        content: Data.content(oldState, thing),
        children: Data.childConnections(oldState, thing).map((c) => {
          return {
            name: c.connectionId,
            child: Data.connectionChild(oldState, c)!,
          };
        }),
        isPage: Data.isPage(oldState, thing),
      })),
    );
  }

  // Selected thing:

  const [selectedThing, setSelectedThing_] = React.useState(extractThingFromURL());

  function setSelectedThing(thing: string): void {
    // TODO: Update title?
    setSelectedThing_(thing);
    window.history.pushState(undefined, document.title, `#${thing}`);
  }

  // TODO: We should manage this in a cleaner way, in case anyone else also
  // wants to set onpopstate.
  window.onpopstate = (ev: PopStateEvent) => {
    setSelectedThing_(extractThingFromURL());
  };

  // Tree:

  const [tree, setTree] = React.useState(T.fromRoot(state, selectedThing));

  React.useEffect(() => {
    setTree(T.fromRoot(state, selectedThing));
  }, [selectedThing]);

  // Drag and drop:

  const [drag, setDrag] = React.useState({current: null, target: null} as DragInfo);

  // Popup:
  const [activePopup, setActivePopup] = React.useState<
    ((state: State, tree: T.Tree, target: T.NodeRef, selection: string) => [State, T.Tree]) | null
  >(null);
  const [popupTarget, setPopupTarget] = React.useState<T.NodeRef | null>(null);
  const [selectionInFocusedContent, setSelectionInFocusedContent] = React.useState<{
    start: number;
    end: number;
  } | null>(null);

  // Tutorial:
  const [tutorialState, setTutorialState_] = React.useState<Tutorial.State>(
    Tutorial.initialize(initialTutorialFinished),
  );
  function setTutorialState(tutorialState: Tutorial.State): void {
    setTutorialState_(tutorialState);
    if (!Tutorial.isActive(tutorialState)) {
      storage.setTutorialFinished();
    }
  }

  // Changelog
  const [changelogShown, setChangelogShown] = React.useState<boolean>(false);

  return {
    state,
    setState,
    setLocalState,
    undo: undo_,
    updateLocalState: (update) => {
      // [TODO] I'm almost certain that this is not how things are supposed to
      // be done.
      setLocalState((state) => {
        const newState = update(state);
        setTree((tree) => T.refresh(tree, newState));
        return newState;
      });
    },
    selectedThing,
    setSelectedThing,
    tree,
    setTree,
    drag,
    setDrag,
    activePopup,
    // Work around problem with setting state to callback:
    setActivePopup(
      arg: ((state: State, tree: T.Tree, target: T.NodeRef, selection: string) => [State, T.Tree]) | null,
    ) {
      return setActivePopup(() => arg);
    },
    popupTarget,
    setPopupTarget,
    selectionInFocusedContent,
    setSelectionInFocusedContent,
    tutorialState,
    setTutorialState,
    changelogShown,
    setChangelogShown,
    changelog: ChangelogData,
    storage,
    server,
  };
}

function App({
  initialState,
  initialTutorialFinished,
  username,
  storage,
  server,
}: {
  initialState: State;
  initialTutorialFinished: boolean;
  username?: string;
  storage: Storage.Storage;
  server?: API.Server;
}) {
  const context = useContext({initialState, initialTutorialFinished, storage, server});

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
      console.log("Undoing");
      Actions.execute(context, "undo");
      ev.preventDefault();
    } else if (Sh.matches(ev, Actions.shortcut("find"))) {
      Actions.execute(context, "find");
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
      onFocus={(ev) => {
        if (ev.target === appRef.current) {
          console.log("Unfocusing item due to click on background");
          context.setTree(T.unfocus(context.tree));
        }
      }}
      tabIndex={-1}
      className="app">
      {context.activePopup === null ? null : (
        <ThingSelectPopup
          hide={() => context.setActivePopup(null)}
          state={context.state}
          create={(content: string) => {
            const target = context.popupTarget;
            if (target === null) {
              console.warn("Aborting popup action because nothing is focused.");
              return;
            }
            const [state2, selection] = Data.create(context.state);
            const state3 = Data.setContent(state2, selection, [content]);
            const [newState, newTree] = context.activePopup!(state3, context.tree, target, selection);
            context.setState(newState);
            context.setTree(newTree);
          }}
          submit={(selection: string) => {
            const target = context.popupTarget;
            if (target === null) {
              console.warn("Aborting popup action because nothing is focused.");
              return;
            }
            const [newState, newTree] = context.activePopup!(context.state, context.tree, target, selection);
            context.setState(newState);
            context.setTree(newTree);
          }}
          seedText={(() => {
            const start = context.selectionInFocusedContent?.start;
            const end = context.selectionInFocusedContent?.end;

            if (
              start !== undefined &&
              end !== undefined &&
              start - end !== 0 &&
              context.popupTarget !== null
            ) {
              return Editing.contentToEditString(
                Data.content(context.state, T.thing(context.tree, context.popupTarget)),
              ).substring(start, end);
            }
          })()}
        />
      )}
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
      {toolbarShown ? <Toolbar context={context} /> : null}
      {!showSplash && (
        <Tutorial.TutorialBox state={context.tutorialState} setState={context.setTutorialState} />
      )}
      <Changelog
        changelog={context.changelog}
        visible={context.changelogShown}
        hide={() => context.setChangelogShown(false)}
      />
      <ThingOverview context={context} />
      {showSplash &&
        ReactDOM.createPortal(<Splash splashCompleted={() => setShowSplash(false)} />, document.body)}
    </div>
  );
}

function ThingOverview(p: {context: Context}) {
  const hasReferences = Data.backreferences(p.context.state, p.context.selectedThing).length > 0;

  return (
    <div className="overview">
      <ParentsOutline context={p.context} />
      <div className="overview-main">
        <Editor context={p.context} node={T.root(p.context.tree)} className="selected-content" />
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
  const parentItems = T.otherParentsChildren(p.context.tree, T.root(p.context.tree)).map(
    (child: T.NodeRef) => {
      return <ExpandableItem isOtherParent key={child.id} node={child} context={p.context} />;
    },
  );

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
      return <ExpandableItem isReference key={child.id} node={child} context={p.context} />;
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
      {T.children(p.context.tree, T.root(p.context.tree)).length === 0 && (
        <PlaceholderItem context={p.context} parent={T.root(p.context.tree)} />
      )}
    </Subtree>
  );
}

function PlaceholderItem(p: {context: Context; parent: T.NodeRef}) {
  function onFocus(ev: React.FocusEvent<HTMLDivElement>): void {
    const [newState, newTree, _, newId] = T.createChild(
      p.context.state,
      p.context.tree,
      T.root(p.context.tree),
    );
    p.context.setState(newState);
    p.context.setTree(T.focus(newTree, newId));
    ev.stopPropagation();
    ev.preventDefault();
  }

  return (
    <li className="item">
      <span>
        <Bullet
          beginDrag={() => {
            return;
          }}
          status="terminal"
          toggle={() => {
            return;
          }}
        />
        <span className="content placeholder-child" onFocus={onFocus} tabIndex={0}>
          New Item
        </span>
      </span>
    </li>
  );
}

function ExpandableItem(p: {
  context: Context;
  node: T.NodeRef;
  parent?: T.NodeRef;
  className?: string;
  isOpenedLink?: boolean;
  isOtherParent?: boolean;
  isReference?: boolean;
}) {
  function toggle() {
    if (p.isOpenedLink && p.parent !== undefined) {
      p.context.setTree(
        T.toggleLink(p.context.state, p.context.tree, p.parent, T.thing(p.context.tree, p.node)),
      );
    } else if (p.isOtherParent) {
      // Behavior of parents is swapped – clicking jumps, middle click expands.
      p.context.setSelectedThing(T.thing(p.context.tree, p.node));
    } else {
      p.context.setTree(T.toggle(p.context.state, p.context.tree, p.node));
    }
  }

  function jump() {
    if (p.isOtherParent) {
      // Behavior of parents is swapped – clicking jumps, middle click expands.
      p.context.setTree(T.toggle(p.context.state, p.context.tree, p.node));
    } else {
      p.context.setSelectedThing(T.thing(p.context.tree, p.node));
    }
  }

  const expanded = T.expanded(p.context.tree, p.node);
  const terminal =
    expanded &&
    T.children(p.context.tree, p.node).length === 0 &&
    T.otherParentsChildren(p.context.tree, p.node).length === 0 &&
    T.backreferencesChildren(p.context.tree, p.node).length === 0 &&
    T.openedLinksChildren(p.context.tree, p.node).length === 0;

  const isPage = Data.isPage(p.context.state, T.thing(p.context.tree, p.node));

  function beginDrag() {
    p.context.setDrag({current: p.node, target: null, finished: false});
  }

  let className = "item";
  if (p.className) className += " " + p.className;
  if (isPage) className += " page";
  if (p.context.drag.current !== null && p.context.drag.target?.id === p.node.id) className += " drop-target";
  if (p.context.drag.current?.id === p.node.id && p.context.drag.target !== null) className += " drag-source";

  const subtree = <Subtree context={p.context} parent={p.node} grandparent={p.parent} />;

  const bulletAttrs: {specialType?: "parent" | "reference" | "opened-link"} = p.isOtherParent
    ? {specialType: "parent"}
    : p.isReference
    ? {specialType: "reference"}
    : p.isOpenedLink
    ? {specialType: "opened-link"}
    : {};

  return (
    <li className="subtree-container">
      {/* data-id is used for drag and drop. */}
      <div className={className} data-id={p.node.id}>
        <OtherParentsSmall context={p.context} child={p.node} parent={p.parent} />
        <Bullet
          {...bulletAttrs}
          beginDrag={beginDrag}
          status={terminal ? "terminal" : expanded ? "expanded" : "collapsed"}
          toggle={toggle}
          onMiddleClick={jump}
        />
        <Content context={p.context} node={p.node} />
      </div>
      {expanded && !terminal && subtree}
    </li>
  );
}

function OtherParentsSmall(props: {context: Context; child: T.NodeRef; parent?: T.NodeRef}) {
  const otherParents = Data.otherParents(
    props.context.state,
    T.thing(props.context.tree, props.child),
    props.parent && T.thing(props.context.tree, props.parent),
  );

  const listItems = otherParents.map((otherParentThing) => {
    return (
      <li>
        <span
          className="other-parent-small"
          onClick={() => {
            props.context.setSelectedThing(otherParentThing);
          }}
          title={Data.contentText(props.context.state, otherParentThing)}>
          <Bullet specialType="parent" beginDrag={() => {}} status="collapsed" toggle={() => {}} />
          &nbsp;
          {truncateEllipsis(Data.contentText(props.context.state, otherParentThing), 30)}
        </span>
      </li>
    );
  });

  return <ul className="other-parents-small">{listItems}</ul>;
}

function Content(p: {context: Context; node: T.NodeRef}) {
  function onKeyDown(
    ev: KeyboardEvent,
    notes: {startOfItem: boolean; endOfItem: boolean; firstLine: boolean; lastLine: boolean},
  ): boolean {
    function tryAction(action: Actions.ActionName): boolean {
      if (Sh.matches(ev, Actions.shortcut(action))) {
        Actions.execute(p.context, action);
        return true;
      } else {
        return false;
      }
    }

    // [TODO] Is there a reason for this weird ordering? We can probably clean
    // this up.

    if (tryAction("indent") || tryAction("unindent") || tryAction("down") || tryAction("up")) {
      return true;
    } else if (ev.key === "Tab") {
      p.context.setTree(T.toggle(p.context.state, p.context.tree, p.node));
      return true;
    } else if (ev.key === "ArrowUp" && !ev.ctrlKey && !ev.altKey && notes.firstLine) {
      p.context.setTree(T.focusUp(p.context.tree));
      return true;
    } else if (ev.key === "ArrowDown" && !ev.ctrlKey && !ev.altKey && notes.lastLine) {
      p.context.setTree(T.focusDown(p.context.tree));
      return true;
    } else if (tryAction("new-child")) {
      return true;
    } else if (Sh.matches(ev, {secondaryMod: true, key: "Enter"})) {
      Actions.execute(p.context, "new");
      return true;
    } else if (ev.key === "Enter" && !ev.shiftKey) {
      // [TODO] Couldn't we handle this logic in the action code itself. We
      // would need to check where in the item we are, which would require
      // accessing the current selection from the context.

      if (notes.endOfItem) {
        Actions.execute(p.context, "new");
        return true;
      } else if (notes.startOfItem) {
        const [newState, newTree, _, newId] = T.createSiblingBefore(p.context.state, p.context.tree, p.node);
        p.context.setState(newState);
        p.context.setTree(T.focus(newTree, newId));
        return true;
      } else {
        return false;
      }
    } else if (
      tryAction("remove") ||
      tryAction("destroy") ||
      tryAction("insert-child") ||
      tryAction("insert-sibling") ||
      tryAction("insert-parent") ||
      tryAction("insert-link") ||
      tryAction("toggle-type")
    ) {
      return true;
    } else {
      return false;
    }
  }

  return <Editor context={p.context} node={p.node} className="content" onKeyDown={onKeyDown} />;
}

function BackreferencesItem(p: {context: Context; parent: T.NodeRef}) {
  const backreferences = Data.backreferences(p.context.state, T.thing(p.context.tree, p.parent));

  if (backreferences.length === 0) {
    return null;
  }

  const children = T.backreferencesChildren(p.context.tree, p.parent).map((child) => {
    return <ExpandableItem isReference key={child.id} node={child} context={p.context} />;
  });

  return (
    <>
      <li className="item">
        <div>
          <button
            onClick={() =>
              p.context.setTree(T.toggleBackreferences(p.context.state, p.context.tree, p.parent))
            }
            className="backreferences-text">
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
    return (
      <ExpandableItem
        className="opened-link"
        key={child.id}
        node={child}
        parent={p.parent}
        context={p.context}
        isOpenedLink
      />
    );
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

// User Page

function UserPage(props: {server: API.Server; username: string}) {
  const [emailField, setEmailField] = React.useState<string>("(Loading...)");
  const [passwordField, setPasswordField] = React.useState<string>("");

  React.useEffect(() => {
    props.server.getEmail().then((email) => setEmailField(email));
  }, []);

  return (
    <div>
      <div>
        You are <strong>{props.username}</strong>.
      </div>
      <hr />
      <div>
        <input value={emailField} onChange={(ev) => setEmailField(ev.target.value)} />
        <button
          onClick={async () => {
            await props.server.setEmail(emailField);
            window.location.reload();
          }}>
          Change email
        </button>
      </div>
      <div>
        <input value={passwordField} onChange={(ev) => setPasswordField(ev.target.value)} type="password" />
        <button
          onClick={async () => {
            await props.server.setPassword(passwordField);
            window.location.reload();
          }}>
          Change password
        </button>
      </div>
      <hr />
      <button
        onClick={async () => {
          if (confirm("Are you sure you want to PERMANENTLY DELETE YOUR ACCOUNT AND ALL YOUR DATA?")) {
            await props.server.deleteAccount(props.username);
            window.location.href = "/";
          }
        }}>
        Delete account and all data
      </button>
      <hr />
      <div>
        <h1>Export to Roam</h1>
        <p>
          Click the button below to download a file that can be imported into{" "}
          <ExternalLink href="https://roamresearch.com/">Roam Research</ExternalLink>. To import it, select{" "}
          <b>Import Files</b> in the top-right menu inside Roam.
        </p>
        <p>
          All your notes will be imported to a single page, because Roam does not let you have multiple pages
          with the same name. (So some documents that are valid in Thinktool would not be in Roam.)
          Additionally, items with multiple parents will turn into "embedded" content inside Roam. This is
          because Roam cannot represent an item with multiple parents, unlike Thinktool.
        </p>
        <button
          onClick={async () => {
            // https://stackoverflow.com/questions/45831191/generate-and-download-file-from-js
            function download(filename: string, text: string) {
              const element = document.createElement("a");
              element.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
              element.download = filename;
              element.style.display = "none";
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }

            const state = API.transformFullStateResponseIntoState(await props.server.getFullState());
            download("thinktool-export-for-roam.json", ExportRoam.exportString(state));
          }}>
          Download data for importing into Roam
        </button>
      </div>
    </div>
  );
}

// ==

// Web app that synchronizes with the server over API.
export async function thinktoolApp({apiHost}: {apiHost: string}) {
  const appElement = document.querySelector("#app")! as HTMLDivElement;

  const server = API.initialize(apiHost);

  const username = await server.getUsername();
  if (username === null) {
    console.log("Not logged in. Redirecting to login page.");
    window.location.href = "/login.html";
  }

  const storage = Storage.server(server);

  ReactDOM.render(
    <App
      initialState={API.transformFullStateResponseIntoState(await storage.getFullState())}
      initialTutorialFinished={await storage.getTutorialFinished()}
      username={username ?? "<error>"}
      storage={storage}
      server={server}
    />,
    appElement,
  );
}

export async function startLocalApp({
  storage,
  ExternalLink,
}: {
  storage: Storage.Storage;
  ExternalLink: ExternalLinkType;
}) {
  const appElement = document.querySelector("#app")! as HTMLDivElement;

  ReactDOM.render(
    <ExternalLinkProvider value={ExternalLink}>
      <App
        initialState={API.transformFullStateResponseIntoState(await storage.getFullState())}
        initialTutorialFinished={await storage.getTutorialFinished()}
        storage={storage}
      />
    </ExternalLinkProvider>,

    appElement,
  );
}

export async function thinktoolDemo({
  apiHost,
  data,
}: {
  apiHost: string;
  data: Communication.FullStateResponse;
}) {
  const appElement = document.querySelector("#app")! as HTMLDivElement;
  ReactDOM.render(
    <App
      initialState={API.transformFullStateResponseIntoState(data)}
      initialTutorialFinished={false}
      storage={Storage.ignore()}
    />,
    appElement,
  );
}

export async function thinktoolUser({apiHost}: {apiHost: string}) {
  const userElement = document.querySelector("#user")! as HTMLDivElement;
  ReactDOM.render(
    <UserPage
      server={API.initialize(apiHost)}
      username={(await API.initialize(apiHost).getUsername()) ?? "error!!"}
    />,
    userElement,
  );
}

export * as Storage from "./storage";
export {Communication} from "@thinktool/shared";
