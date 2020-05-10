import "regenerator-runtime/runtime"; // Required by Parcel for reasons that I do not understand.

import {General as G, Communication} from "thinktool-shared";

import {State} from "./data";
import {Context, DragInfo} from "./context";

import * as Data from "./data";
import * as T from "./tree";
import * as Tutorial from "./tutorial";
import * as Server from "./server-api";
import {actionsWith} from "./actions";

import * as C from "./ui/content";
import ThingSelectPopup from "./ui/ThingSelectPopup";
import Toolbar from "./ui/Toolbar";
import Changelog from "./ui/Changelog";

import * as DemoData from "./demo-data.json";

import * as React from "react";
import * as ReactDOM from "react-dom";

import undo from "./undo";

// ==

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
    timeouts.current[key] = setTimeout(() => {
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
          JSON.stringify(G.removeKey(oldState.things[thing] as any, "content")) ===
          JSON.stringify(G.removeKey(newState.things[thing] as any, "content"))
        ) {
          changedContent.push(thing);
        } else {
          changed.push(thing);
        }
      }
    } else {
      for (const connection of oldState.things[thing].children) {
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

function useContext(initialState: State, initialTutorialFinished: boolean, args?: {local: boolean}): Context {
  const [state, setLocalState] = React.useState(initialState);

  const batched = useBatched(200);

  function setState(newState: State): void {
    if (newState !== state) {
      undo.pushState(state);
      setLocalState(newState);

      if (!args?.local) {
        const diff = diffState(state, newState);
        for (const thing of diff.deleted) {
          Server.deleteThing(thing);
        }
        for (const thing of diff.changedContent) {
          batched.update(thing, () => {
            Server.setContent(thing, Data.content(newState, thing));
          });
        }
        if (diff.added.length !== 0 || diff.changed.length !== 0) {
          Server.updateThings(
            [...diff.added, ...diff.changed].map((thing) => ({
              name: thing,
              content: Data.content(newState, thing),
              children: Data.childConnections(newState, thing).map((c) => {
                return {
                  name: c.connectionId,
                  child: Data.connectionChild(newState, c),
                  tag: Data.tag(newState, c) ?? undefined,
                };
              }),
            })),
          );
        }
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
    if (!args?.local) {
      const diff = diffState(state, oldState);
      for (const thing of diff.deleted) {
        Server.deleteThing(thing);
      }
      Server.updateThings(
        [...diff.added, ...diff.changed].map((thing) => ({
          name: thing,
          content: Data.content(oldState, thing),
          children: Data.childConnections(oldState, thing).map((c) => {
            return {
              name: c.connectionId,
              child: Data.connectionChild(oldState, c),
              tag: Data.tag(oldState, c) ?? undefined,
            };
          }),
        })),
      );
    }
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
    if (!Tutorial.isActive(tutorialState) && !args?.local) {
      Server.setTutorialFinished();
    }
  }

  // Changelog
  const [changelogShown, setChangelogShown] = React.useState<boolean>(false);
  const [changelog, setChangelog] = React.useState<Communication.Changelog | "loading">("loading");
  React.useEffect(() => {
    Server.getChangelog().then((changelog) => setChangelog(changelog));
  }, []);

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
    changelog,
  };
}

function App({
  initialState,
  initialTutorialFinished,
  username,
  args,
}: {
  initialState: State;
  initialTutorialFinished: boolean;
  username: string;
  args?: {local: boolean};
}) {
  const context = useContext(initialState, initialTutorialFinished, args);

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
    if (args?.local) return;

    return Server.onChanges(async (changes) => {
      for (const changedThing of changes) {
        const thingData = await Server.getThingData(changedThing);

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

          const nChildren = Data.children(newState, changedThing).length;
          for (let i = 0; i < nChildren; ++i) {
            newState = Data.removeChild(newState, changedThing, 0);
          }
          for (const childConnection of thingData.children) {
            newState = Data.addChild(newState, changedThing, childConnection.child, childConnection.name)[0];
            if (childConnection.tag !== undefined)
              newState = Data.setTag(newState, {connectionId: childConnection.name}, childConnection.tag);
          }

          return newState;
        });
      }
    });
  }, []);

  document.onkeydown = (ev) => {
    if (ev.key === "z" && ev.ctrlKey) {
      console.log("Undoing");
      context.undo();
      ev.preventDefault();
    }
  };

  React.useEffect(() => {
    if (context.drag.current === null) return;

    function mousemove(ev: MouseEvent): void {
      const [x, y] = [ev.clientX, ev.clientY];

      let element: HTMLElement | null | undefined = document.elementFromPoint(x, y) as HTMLElement;
      while (element && !element.classList.contains("item-line")) {
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
      while (element && !element.classList.contains("item-line")) {
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

  const appRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={appRef}
      onFocus={(ev) => {
        if (ev.target === appRef.current) {
          context.setTree(T.unfocus(context.tree));
        }
      }}
      tabIndex={0}
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
            const state3 = Data.setContent(state2, selection, content);
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

            if (start && end && start - end !== 0 && context.popupTarget) {
              return Data.content(context.state, T.thing(context.tree, context.popupTarget)).substring(
                start,
                end,
              );
            }
          })()}
        />
      )}
      <div className="top-bar">
        <a className="logo" href="/">
          Thinktool
        </a>
        <div id="current-user">
          <a className="username" href="/user.html">
            {username}
          </a>
          <a className="log-out" href={Server.logOutUrl}>
            log out
          </a>
        </div>
      </div>
      <Toolbar context={context} />
      <Tutorial.TutorialBox state={context.tutorialState} setState={context.setTutorialState} />
      <Changelog
        changelog={context.changelog}
        visible={context.changelogShown}
        hide={() => context.setChangelogShown(false)}
      />
      <ThingOverview context={context} />
    </div>
  );
}

function ThingOverview(p: {context: Context}) {
  const hasReferences = Data.backreferences(p.context.state, p.context.selectedThing).length > 0;

  return (
    <div className="overview">
      <ParentsOutline context={p.context} />
      <div className="overview-main">
        <C.Content context={p.context} node={T.root(p.context.tree)} className="selected-content" />
        <div className="children">
          <Outline context={p.context} />
        </div>
      </div>
      {hasReferences && (
        <>
          <div className="references">
            <div className="references-inner">
              <h1 className="link-section">References</h1>
              <ReferencesOutline context={p.context} />
            </div>
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
      return <ExpandableItem key={child.id} node={child} context={p.context} />;
    },
  );

  const subtree = <ul className="outline-tree">{parentItems}</ul>;

  if (parentItems.length === 0) {
    return (
      <div className="parents">
        <div className="parents-inner">
          <span className="no-parents">No parents</span>
        </div>
      </div>
    );
  } else {
    return (
      <div className="parents">
        <div className="parents-inner">
          <h1 className="link-section">Parents</h1>
          {subtree}
        </div>
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
    return <ul className="outline-tree">{referenceItems}</ul>;
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
    <li className="outline-item">
      <span className="item-line">
        <Bullet
          beginDrag={() => {
            return;
          }}
          expanded={true}
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

function ConnectionTag(p: {context: Context; tag: string}) {
  return <span className="connection-tag">{Data.contentText(p.context.state, p.tag)}</span>;
}

export function ExpandableItem(p: {
  context: Context;
  node: T.NodeRef;
  parent?: T.NodeRef;
  className?: string;
  hideTagged?: boolean;
  hideTag?: boolean;
  otherParentText?: string;
}) {
  function toggle() {
    p.context.setTree(T.toggle(p.context.state, p.context.tree, p.node));
  }

  const expanded = T.expanded(p.context.tree, p.node);

  function beginDrag() {
    p.context.setDrag({current: p.node, target: null, finished: false});
  }

  let className = "item-line";

  if (p.className) className += " " + p.className;
  if (p.context.drag.current !== null && p.context.drag.target?.id === p.node.id) className += " drop-target";
  if (p.context.drag.current?.id === p.node.id && p.context.drag.target !== null) className += " drag-source";

  const tag = T.tag(p.context.state, p.context.tree, p.node);

  const subtree = (
    <Subtree hideTagged={p.hideTagged} context={p.context} parent={p.node} grandparent={p.parent} />
  );

  return (
    <li className="outline-item">
      <span className={className} data-id={p.node.id}>
        {/* data-id is used for drag and drop. */}
        <Bullet
          beginDrag={beginDrag}
          expanded={T.expanded(p.context.tree, p.node)}
          toggle={toggle}
          onMiddleClick={() => {
            p.context.setSelectedThing(T.thing(p.context.tree, p.node));
          }}
        />
        {p.otherParentText !== undefined && <span className="other-parents-text">{p.otherParentText}</span>}
        {tag !== null && !p.hideTag && <ConnectionTag context={p.context} tag={tag} />}
        <Content context={p.context} node={p.node} />
      </span>
      {expanded && subtree}
    </li>
  );
}

function Bullet(p: {expanded: boolean; toggle: () => void; beginDrag: () => void; onMiddleClick?(): void}) {
  function onAuxClick(ev: React.MouseEvent<never>): void {
    // ev.button === 1 checks for middle click.
    if (ev.button === 1 && p.onMiddleClick !== undefined) p.onMiddleClick();
  }

  return (
    <span
      className={`bullet ${p.expanded ? "expanded" : "collapsed"}`}
      onMouseDown={p.beginDrag}
      onTouchStart={p.beginDrag}
      onClick={() => p.toggle()}
      onAuxClick={onAuxClick}
    />
  );
}

function Content(p: {context: Context; node: T.NodeRef}) {
  const actions = actionsWith(p.context, p.node);

  function onKeyDown(
    ev: React.KeyboardEvent<{}>,
    notes: {startOfItem: boolean; endOfItem: boolean},
  ): boolean {
    if (ev.key === "ArrowRight" && ev.altKey && ev.ctrlKey) {
      actions.indent();
      return true;
    } else if (ev.key === "ArrowLeft" && ev.altKey && ev.ctrlKey) {
      actions.unindent();
      return true;
    } else if (ev.key === "ArrowDown" && ev.altKey && ev.ctrlKey) {
      actions.moveDown();
      return true;
    } else if (ev.key === "ArrowUp" && ev.altKey && ev.ctrlKey) {
      actions.moveUp();
      return true;
    } else if (ev.key === "Tab") {
      p.context.setTree(T.toggle(p.context.state, p.context.tree, p.node));
      return true;
    } else if (ev.key === "ArrowUp") {
      p.context.setTree(T.focusUp(p.context.tree));
      return true;
    } else if (ev.key === "ArrowDown") {
      p.context.setTree(T.focusDown(p.context.tree));
      return true;
    } else if (ev.key === "Enter" && ev.altKey) {
      actions.createChild();
      return true;
    } else if (ev.key === "Enter" && ev.ctrlKey) {
      actions.createSiblingAfter();
      return true;
    } else if (ev.key === "Enter" && !ev.shiftKey) {
      if (notes.endOfItem) {
        actions.createSiblingAfter();
        return true;
      } else if (notes.startOfItem) {
        const [newState, newTree, _, newId] = T.createSiblingBefore(p.context.state, p.context.tree, p.node);
        p.context.setState(newState);
        p.context.setTree(T.focus(newTree, newId));
        return true;
      } else {
        return false;
      }
    } else if (ev.key === "Backspace" && ev.altKey) {
      actions.removeFromParent();
      return true;
    } else if (ev.key === "Delete" && ev.altKey) {
      actions.delete();
      return true;
    } else if (ev.key === "c" && ev.altKey) {
      p.context.setPopupTarget(T.focused(p.context.tree));
      p.context.setActivePopup((state, tree, target, selection) => {
        const [newState, newTree] = T.insertChild(state, tree, target, selection, 0);
        return [newState, newTree];
      });
      return true;
    } else if (ev.key === "s" && ev.altKey) {
      actions.showSiblingPopup();
      return true;
    } else if (ev.key === "p" && ev.altKey) {
      actions.showParentPopup();
      return true;
    } else if (ev.key === "l" && ev.altKey) {
      actions.showLinkPopup();
      return true;
    } else {
      return false;
    }
  }

  return <C.Content context={p.context} node={p.node} className="content" onKeyDown={onKeyDown} />;
}

function BackreferencesItem(p: {context: Context; parent: T.NodeRef}) {
  const backreferences = Data.backreferences(p.context.state, T.thing(p.context.tree, p.parent));

  if (backreferences.length === 0) {
    return null;
  }

  return (
    <li className="outline-item backreferences-item">
      <span className="item-line">
        <Bullet
          beginDrag={() => {}}
          expanded={T.backreferencesExpanded(p.context.tree, p.parent)}
          toggle={() => p.context.setTree(T.toggleBackreferences(p.context.state, p.context.tree, p.parent))}
          onMiddleClick={() => {}}
        />
        <span className="backreferences-text">{backreferences.length} references</span>
      </span>
      {T.backreferencesExpanded(p.context.tree, p.parent) && (
        <BackreferencesSubtree parent={p.parent} context={p.context} />
      )}
    </li>
  );
}

function BackreferencesSubtree(p: {context: Context; parent: T.NodeRef}) {
  const children = T.backreferencesChildren(p.context.tree, p.parent).map((child) => {
    return <ExpandableItem key={child.id} node={child} context={p.context} />;
  });

  return <ul className="outline-tree">{children}</ul>;
}

function OtherParentsItem(p: {context: Context; parent: T.NodeRef; grandparent?: T.NodeRef}) {
  const otherParents = Data.otherParents(
    p.context.state,
    T.thing(p.context.tree, p.parent),
    p.grandparent && T.thing(p.context.tree, p.grandparent),
  );

  if (otherParents.length === 0) {
    return null;
  }

  if (otherParents.length <= 2) {
    let newTree = p.context.tree;
    const otherParentNodes = T.otherParentsChildren(newTree, p.parent);
    return (
      <>
        {otherParentNodes.map((otherParentNode) => {
          return (
            <ExpandableItem
              key={JSON.stringify(otherParentNode)}
              otherParentText={p.grandparent ? "other parent" : "parent"}
              context={p.context}
              node={otherParentNode}
              parent={p.parent}
            />
          );
        })}
      </>
    );
  }

  return (
    <li className="outline-item other-parents-item">
      <span className="item-line">
        <Bullet
          beginDrag={() => {}}
          expanded={T.otherParentsExpanded(p.context.tree, p.parent)}
          toggle={() => p.context.setTree(T.toggleOtherParents(p.context.state, p.context.tree, p.parent))}
        />
        <span className="other-parents-text">
          {otherParents.length} {p.grandparent ? " other parents" : "parents"}
        </span>
      </span>
      {T.otherParentsExpanded(p.context.tree, p.parent) && (
        <OtherParentsSubtree parent={p.parent} grandparent={p.grandparent} context={p.context} />
      )}
    </li>
  );
}

function OtherParentsSubtree(p: {context: Context; parent: T.NodeRef; grandparent?: T.NodeRef}) {
  const children = T.otherParentsChildren(p.context.tree, p.parent).map((child) => {
    return <ExpandableItem key={child.id} node={child} context={p.context} />;
  });

  return <ul className="outline-tree">{children}</ul>;
}

function Subtree(p: {
  context: Context;
  parent: T.NodeRef;
  grandparent?: T.NodeRef;
  children?: React.ReactNode[] | React.ReactNode;
  omitReferences?: boolean;
  hideTagged?: boolean;
}) {
  const children = T.children(p.context.tree, p.parent)
    .filter((child) => {
      return !(p.hideTagged && T.tag(p.context.state, p.context.tree, child));
    })
    .map((child) => {
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
      />
    );
  });

  return (
    <ul className="outline-tree">
      {openedLinksChildren}
      {children}
      {p.children}
      {!p.omitReferences && (
        <OtherParentsItem
          key="other-parents"
          parent={p.parent}
          grandparent={p.grandparent}
          context={p.context}
        />
      )}
      {!p.omitReferences && <BackreferencesItem key="backreferences" parent={p.parent} context={p.context} />}
    </ul>
  );
}

// User Page

function UserPage(props: {username: string}) {
  const [emailField, setEmailField] = React.useState<string>("(Loading...)");
  const [passwordField, setPasswordField] = React.useState<string>("");

  React.useEffect(() => {
    Server.getEmail().then((email) => setEmailField(email));
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
            await Server.setEmail(emailField);
            window.location.reload();
          }}>
          Change email
        </button>
      </div>
      <div>
        <input value={passwordField} onChange={(ev) => setPasswordField(ev.target.value)} type="password" />
        <button
          onClick={async () => {
            await Server.setPassword(passwordField);
            window.location.reload();
          }}>
          Change password
        </button>
      </div>
      <hr />
      <button
        onClick={async () => {
          if (confirm("Are you sure you want to PERMANENTLY DELETE YOUR ACCOUNT AND ALL YOUR DATA?")) {
            await Server.deleteAccount(props.username);
            window.location.href = "/";
          }
        }}>
        Delete account and all data
      </button>
    </div>
  );
}

// ==

export async function thinktoolApp() {
  const appElement = document.querySelector("#app")! as HTMLDivElement;

  const username = await Server.getUsername();
  if (username === null) {
    console.log("Not logged in. Redirecting to login page.");
    window.location.href = "/login.html";
  }

  ReactDOM.render(
    <App
      initialState={await Server.getFullState()}
      initialTutorialFinished={await Server.getTutorialFinished()}
      username={(await Server.getUsername()) ?? "<error!>"}
    />,
    appElement,
  );
}

export async function thinktoolDemo() {
  const appElement = document.querySelector("#app")! as HTMLDivElement;
  Server.ping("demo");
  ReactDOM.render(
    <App
      initialState={Server.transformFullStateResponseIntoState(DemoData)}
      initialTutorialFinished={false}
      username={"demo"}
      args={{local: true}}
    />,
    appElement,
  );
}

export async function thinktoolUser() {
  const userElement = document.querySelector("#user")! as HTMLDivElement;
  ReactDOM.render(<UserPage username={(await Server.getUsername()) ?? "<error!>"} />, userElement);
}
