import "regenerator-runtime/runtime";  // Required by Parcel for reasons that I do not understand.

import {Things} from "./client/data";
import {Tree} from "./client/tree";

import * as Data from "./client/data";
import * as T from "./client/tree";
import * as Server from "./client/server-api";

import * as C from "./client/ui/content";
import Search from "./client/ui/search";
import { ThingSelectPopup } from "./client/ui/thing-select-popup";

import * as Demo from "./client/demo";

import * as React from "react";
import * as ReactDOM from "react-dom";

import undo from "./client/undo";

// ==

interface DragInfo {
  current: T.NodeRef | null;
  target: T.NodeRef | null;
  finished: boolean | "copy";
}

interface Context {
  state: Things;
  setState(value: Things): void;
  setLocalState(value: Things): void;
  updateLocalState(f: (value: Things) => Things): void;

  setContent(thing: string, content: string): void;

  undo(): void;

  tree: Tree;
  setTree(value: Tree): void;

  drag: DragInfo;
  setDrag(value: DragInfo): void;

  selectedThing: string;
  setSelectedThing(value: string): void;
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
  const timeouts: React.MutableRefObject<{[key: string]: NodeJS.Timeout}> = React.useRef({});
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

function diffState(oldState: Things, newState: Things): {added: string[]; deleted: string[]; changed: string[]} {
  const added: string[] = [];
  const deleted: string[] = [];
  const changed: string[] = [];

  for (const thing in oldState.things) {
    if (oldState.things[thing] !== newState.things[thing]) {
      if (newState.things[thing] === undefined) {
        deleted.push(thing);
      } else if (JSON.stringify(oldState.things[thing]) !== JSON.stringify(newState.things[thing])) {
        changed.push(thing);
      }
    }
  }

  for (const thing in newState.things) {
    if (oldState.things[thing] === undefined) {
      added.push(thing);
    }
  }

  return {added, deleted, changed};
}

function useContext(initialState: Things, args?: {local: boolean}): Context {
  const [state, setLocalState] = React.useState(initialState);

  const batched = useBatched(200);

  function setContent(thing: string, content: string): void {
    setLocalState(Data.setContent(state, thing, content));
    if (!args?.local) {
      batched.update(`${thing}/content`, () => { Server.setContent(thing, content) });
    }
  }

  // TODO: setState and undo should override timeouts from setContent.

  function setState(newState: Things): void {
    if (newState !== state) {
      undo.pushState(state);
      setLocalState(newState);

      if (!args?.local) {
        const diff = diffState(state, newState);
        for (const thing of diff.deleted) {
          Server.deleteThing(thing);
        }
        for (const thing of [...diff.added, ...diff.changed]) {
          Server.putThing(thing, newState.things[thing]);
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
      for (const thing of [...diff.added, ...diff.changed]) {
        Server.putThing(thing, oldState.things[thing]);
      }
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
  window.onpopstate = (ev) => {
    setSelectedThing_(extractThingFromURL());
  };

  // Tree:

  const [tree, setTree] = React.useState(T.fromRoot(state, selectedThing));

  React.useEffect(() => {
    setTree(T.refresh(tree, state));
  }, [state]);

  React.useEffect(() => {
    setTree(T.fromRoot(state, selectedThing));
  }, [selectedThing]);

  // Drag and drop:

  const [drag, setDrag] = React.useState({current: null, target: null} as DragInfo);

  return {state, setState, setLocalState, setContent, undo: undo_, updateLocalState: setLocalState, selectedThing, setSelectedThing, tree, setTree, drag, setDrag};
}

function App({initialState, username, args}: {initialState: Things; username: string; args?: {local: boolean}}) {
  const context = useContext(initialState, args);

  // If the same user is connected through multiple clients, we want to be able
  // to see changes from other clients on this one.
  //
  // The server makes a websocket available on /api/changes, which notifies us
  // when there are pending changes from another client.

  React.useEffect(() => {
    return Server.onChanges(async (changes) => {
      for (const changedThing of changes) {
        const thingData = await Server.getThingData(changedThing);

        if (thingData === null) {
          // Thing was deleted
          context.updateLocalState(state => Data.remove(state, changedThing));
          continue;
        }

        context.updateLocalState(state => {
          let newState = state;

          if (!Data.exists(newState, changedThing)) {
          // A new item was created
            newState = Data.create(newState, changedThing)[0];
          }

          newState = Data.setContent(newState, changedThing, thingData.content);
          newState = Data.replaceChildren(newState, changedThing, thingData.children);

          return newState;
        });
      }
    });
  }, [context.updateLocalState]);

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

  return <>
    <div className="top-bar">
      <Search context={context}/>
      <div id="current-user"><span className="username">{username}</span> <a className="log-out" href="/logout">log out</a></div>
    </div>
    <ThingOverview context={context}/>
    <Toolbar context={context}/>
  </>;
}

function Toolbar(props: {context: Context}) {
  const focused = T.focused(props.context.tree);

  function createSibling(): void {
    if (focused === null) throw "invalid state";
    const [newState, newTree, _, newId] = T.createSiblingAfter(props.context.state, props.context.tree, focused);
    props.context.setState(newState);
    props.context.setTree(T.focus(newTree, newId));
  }

  function zoom(): void {
    if (focused === null) throw "invalid state";
    props.context.setSelectedThing(T.thing(props.context.tree, focused));
  }

  return (
    <div className="toolbar">
      <button onClick={createSibling} title="Create a new item as a sibling of the currently selected item [enter/ctrl-enter]">New</button>
      <button onClick={zoom} title="Zoom in on selected item [middle-click bullet]">Zoom</button>
    </div>
  );
}

function ThingOverview(p: {context: Context}) {
  const hasReferences = Data.backreferences(p.context.state, p.context.selectedThing).length > 0;

  return (
    <div className="overview">
      <ParentsOutline context={p.context}/>
      <div className="overview-main">
        <C.Content
          things={p.context.state}
          className="selected-content"
          getContentText={thing => Data.contentText(p.context.state, thing)}
          text={Data.content(p.context.state, p.context.selectedThing)}
          setText={(text) => { p.context.setContent(p.context.selectedThing, text) }}/>
        <div className="children">
          <Outline context={p.context}/>
        </div>
      </div>
      { hasReferences && <>
        <div className="references">
          <div className="references-inner">
            <h1 className="link-section">References</h1>
            <ReferencesOutline context={p.context}/>
          </div>
        </div>
      </> }
    </div>
  );
}

// TODO: ParentsOutline and ReferencesOutline should both have appropriate
// custom behavior in response to key-presses (e.g. Alt+Backspace in
// ParentsOutline should remove parent from child).

function ParentsOutline(p: {context: Context}) {
  const parentItems = T.otherParentsChildren(p.context.tree, T.root(p.context.tree)).map((child: T.NodeRef) => {
    return <ExpandableItem key={child.id} node={child} context={p.context}/>;
  });

  const subtree = <ul className="outline-tree">{parentItems}</ul>;

  if (parentItems.length === 0) {
    return <div className="parents">
      <div className="parents-inner">
        <span className="no-parents">No parents</span>
      </div>
    </div>;
  } else {
    return <div className="parents">
      <div className="parents-inner">
        <h1 className="link-section">Parents</h1>
        {subtree}
      </div>
    </div>;
  }
}

function ReferencesOutline(p: {context: Context}) {
  const referenceItems = T.backreferencesChildren(p.context.tree, T.root(p.context.tree)).map((child: T.NodeRef) => {
    return <ExpandableItem key={child.id} node={child} context={p.context}/>;
  });

  if (referenceItems.length === 0) {
    return null;
  } else {
    return <ul className="outline-tree">{referenceItems}</ul>;
  }
}

function Outline(p: {context: Context}) {
  return (
    <Subtree context={p.context} parent={T.root(p.context.tree)} omitReferences={true}>
      { T.children(p.context.tree, T.root(p.context.tree)).length === 0 && <PlaceholderItem context={p.context} parent={T.root(p.context.tree)}/> }
    </Subtree>
  );
}

function PlaceholderItem(p: {context: Context; parent: T.NodeRef}) {
  function onFocus(ev: React.FocusEvent<HTMLDivElement>): void {
    const [newState, newTree, _, newId] = T.createChild(p.context.state, p.context.tree, T.root(p.context.tree));
    p.context.setState(newState);
    p.context.setTree(T.focus(newTree, newId));
    ev.stopPropagation();
    ev.preventDefault();
  }

  return (
    <li className="outline-item">
      <span className="item-line">
        <Bullet beginDrag={() => { return }} expanded={true} toggle={() => { return }}/>
        <span className="content placeholder-child" onFocus={onFocus} tabIndex={0}>New Item</span>
      </span>
    </li>
  );
}

function ExpandableItem(p: {context: Context; node: T.NodeRef; parent?: T.NodeRef; className?: string}) {
  function toggle() {
    p.context.setTree(T.toggle(p.context.state, p.context.tree, p.node));
  }

  const expanded = T.expanded(p.context.tree, p.node);

  function beginDrag() {
    p.context.setDrag({current: p.node, target: null, finished: false});
  }

  // TODO: This seems like a hack, but I'm not sure if it's actually as bad as
  // it looks or if we just need to clean up the code a bit.
  if (p.context.drag.finished && (p.context.drag.target?.id === p.node.id || p.context.drag.target === null)) {
    if (p.context.drag.current !== null && p.context.drag.target !== null && p.context.drag.current?.id !== p.node.id) {
      if (p.context.drag.finished === "copy") {
        const [newState, newTree, newId] = T.copyToAbove(p.context.state, p.context.tree, p.context.drag.current, p.context.drag.target);
        p.context.setState(newState);
        p.context.setTree(T.focus(newTree, newId));
      } else {
        const [newState, newTree] = T.moveToAbove(p.context.state, p.context.tree, p.context.drag.current, p.context.drag.target);
        p.context.setState(newState);
        p.context.setTree(newTree);
      }
    }

    p.context.setDrag({current: null, target: null, finished: false});
  }

  let className = "item-line";
  if (p.className)
    className += " " + p.className;
  if (p.context.drag.current !== null && p.context.drag.target?.id === p.node.id)
    className += " drop-target";
  if (p.context.drag.current?.id === p.node.id && p.context.drag.target !== null)
    className += " drag-source";

  const subtree =
    <Subtree
      context={p.context}
      parent={p.node}
      grandparent={p.parent}/>;

  return (
    <li className="outline-item">
      <span className={className} data-id={p.node.id}> {/* data-id is used for drag and drop. */}
        <Bullet
          beginDrag={beginDrag}
          expanded={T.expanded(p.context.tree, p.node)}
          toggle={toggle}
          onMiddleClick={() => { p.context.setSelectedThing(T.thing(p.context.tree, p.node)) }}/>
        <Content context={p.context} node={p.node}/>
      </span>
      { expanded && subtree }
    </li>
  );
}

function Bullet(p: {expanded: boolean; toggle: () => void; beginDrag: () => void; onMiddleClick?(): void}) {
  function onAuxClick(ev: React.MouseEvent<never>): void {
    if (ev.button === 1) { // Middle click
      if (p.onMiddleClick !== undefined)
        p.onMiddleClick();
    }
  }

  return (
    <span
      className={`bullet ${p.expanded ? "expanded" : "collapsed"}`}
      onMouseDown={p.beginDrag}
      onTouchStart={p.beginDrag}
      onClick={() => p.toggle()}
      onAuxClick={onAuxClick}/>
  );
}

function Content(p: {context: Context; node: T.NodeRef}) {
  const [showChildPopup, setShowChildPopup] = React.useState(false);

  function onKeyDown(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean {
    if (ev.key === "ArrowRight" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.indent(p.context.state, p.context.tree, p.node);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "ArrowLeft" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.unindent(p.context.state, p.context.tree, p.node);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "ArrowDown" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.moveDown(p.context.state, p.context.tree, p.node);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "ArrowUp" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.moveUp(p.context.state, p.context.tree, p.node);
      p.context.setState(newState);
      p.context.setTree(newTree);
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
      const [newState, newTree, _, newId] = T.createChild(p.context.state, p.context.tree, p.node);
      p.context.setState(newState);
      p.context.setTree(T.focus(newTree, newId));
      return true;
    } else if (ev.key === "Enter" && ev.ctrlKey) {
      const [newState, newTree, _, newId] = T.createSiblingAfter(p.context.state, p.context.tree, p.node);
      p.context.setState(newState);
      p.context.setTree(T.focus(newTree, newId));
      return true;
    } else if (ev.key === "Enter" && !ev.shiftKey) {
      if (notes.endOfItem) {
        const [newState, newTree, _, newId] = T.createSiblingAfter(p.context.state, p.context.tree, p.node);
        p.context.setState(newState);
        p.context.setTree(T.focus(newTree, newId));
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
      const [newState, newTree] = T.remove(p.context.state, p.context.tree, p.node);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "Delete" && ev.altKey) {
      const [newState, newTree] = T.removeThing(p.context.state, p.context.tree, p.node);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "c" && ev.altKey) {
      setShowChildPopup(true);
      return true;
    } else {
      return false;
    }
  }

  const insertChildPopup = (() => {
    if (showChildPopup) {
      const range = window.getSelection()?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      return <ThingSelectPopup
        hide={() => setShowChildPopup(false)}
        position={{x: (rect?.x ?? 100) + 2, y: (rect?.y ?? 100) + ((rect?.height ?? 0) / 2)}}
        state={p.context.state}
        submit={(child: string) => {
          const [newState, newTree] = T.insertChild(p.context.state, p.context.tree, p.node, child, 0);
          p.context.setState(newState);
          p.context.setTree(newTree);
        }}
      />;
    } else {
      return null;
    }
  })();

  return <>
    <C.Content
      things={p.context.state}
      className="content"
      getContentText={thing => Data.contentText(p.context.state, thing)}
      focused={T.hasFocus(p.context.tree, p.node)}
      text={Data.content(p.context.state, T.thing(p.context.tree, p.node))}
      setText={(text) => { p.context.setContent(T.thing(p.context.tree, p.node), text) }}
      onFocus={() => { p.context.setTree(T.focus(p.context.tree, p.node)) }}
      isLinkOpen={(thing) => T.isLinkOpen(p.context.tree, p.node, thing)}
      openInternalLink={(thing) => p.context.setTree(T.toggleLink(p.context.state, p.context.tree, p.node, thing))}
      onKeyDown={onKeyDown}/>
    { insertChildPopup }
  </>;
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
      { T.backreferencesExpanded(p.context.tree, p.parent) && <BackreferencesSubtree parent={p.parent} context={p.context}/> }
    </li>
  );
}

function BackreferencesSubtree(p: {context: Context; parent: T.NodeRef}) {
  const children = T.backreferencesChildren(p.context.tree, p.parent).map(child => {
    return <ExpandableItem key={child.id} node={child} context={p.context}/>;
  });

  return (
    <ul className="outline-tree">
      {children}
    </ul>
  );
}

function OtherParentsItem(p: {context: Context; parent: T.NodeRef; grandparent?: T.NodeRef}) {
  const otherParents = Data.otherParents(p.context.state, T.thing(p.context.tree, p.parent), p.grandparent && T.thing(p.context.tree, p.grandparent));

  if (otherParents.length === 0) {
    return null;
  }

  return (
    <li className="outline-item other-parents-item">
      <span className="item-line">
        <Bullet
          beginDrag={() => {}}
          expanded={T.otherParentsExpanded(p.context.tree, p.parent)}
          toggle={() => p.context.setTree(T.toggleOtherParents(p.context.state, p.context.tree, p.parent))}
        />
        <span className="other-parents-text">{otherParents.length} {p.grandparent ? " other parents" : "parents"}</span>
      </span>
      { T.otherParentsExpanded(p.context.tree, p.parent) && <OtherParentsSubtree parent={p.parent} grandparent={p.grandparent} context={p.context}/>}
    </li>
  );
}

function OtherParentsSubtree(p: {context: Context; parent: T.NodeRef; grandparent?: T.NodeRef}) {
  const children = T.otherParentsChildren(p.context.tree, p.parent).map(child => {
    return <ExpandableItem key={child.id} node={child} context={p.context}/>;
  });

  return (
    <ul className="outline-tree">
      {children}
    </ul>
  );
}

function Subtree(p: {context: Context; parent: T.NodeRef; grandparent?: T.NodeRef; children?: React.ReactNode[] | React.ReactNode; omitReferences?: boolean}) {
  const children = T.children(p.context.tree, p.parent).map(child => {
    return <ExpandableItem key={child.id} node={child} parent={p.parent} context={p.context}/>;
  });

  const openedLinksChildren = T.openedLinksChildren(p.context.tree, p.parent).map(child => {
    return <ExpandableItem className="opened-link" key={child.id} node={child} parent={p.parent} context={p.context}/>;
  });

  return (
    <ul className="outline-tree">
      {openedLinksChildren}
      {children}
      {p.children}
      { !p.omitReferences && <BackreferencesItem key="backreferences" parent={p.parent} context={p.context}/> }
      { !p.omitReferences && <OtherParentsItem key="other-parents" parent={p.parent} grandparent={p.grandparent} context={p.context}/> }
    </ul>
  );
}

// ==

async function start(): Promise<void> {
  const appElement = document.querySelector("#app")! as HTMLDivElement;
  const isDemo = appElement.dataset.demo === "true";

  ReactDOM.render(
    isDemo ?
      <App initialState={Demo.initialState} username={"demo"} args={{local: true}}/> :
      <App initialState={await Server.getFullState() as Things} username={await Server.getUsername()}/>,
    appElement
  );
}

start();
