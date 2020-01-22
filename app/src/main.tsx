import {Things} from "./data";
import {Tree} from "./tree";

import * as Data from "./data";
import * as T from "./tree";
import * as Server from "./server-api";

import {PlainText} from "./ui/content";

import * as React from "react";
import * as ReactDOM from "react-dom";

import undo from "./undo";

// ==

interface DragInfo {
  current: number | null;
  target: number | null;
}

interface StateContext {
  state: Things;
  setState(value: Things): void;
  setLocalState(value: Things): void;

  setContent(thing: number, content: string): void;
  setPage(thing: number, page: string): void;
  removePage(thing: number): void;

  undo(): void;
}

type SetSelectedThing = (value: number) => void;

interface TreeContext extends StateContext {
  tree: Tree;
  setTree(value: Tree): void;
  drag: DragInfo;
  setDrag(value: DragInfo): void;
  setSelectedThing: SetSelectedThing;
}

// == Components ==

function extractThingFromURL(): number {
  if (window.location.hash.length > 0) {
    const thing = Number(window.location.hash.slice(1));
    return thing;
  } else {
    // By default, use thing #0. We should probably do something smarter here,
    // like allow the user to set a deafult thing.
    return 0;
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

function diffState(oldState: Things, newState: Things): {added: number[]; deleted: number[]; changed: number[]} {
  const added: number[] = [];
  const deleted: number[] = [];
  const changed: number[] = [];

  for (const thing in oldState.things) {
    if (oldState.things[thing] !== newState.things[thing]) {
      if (newState.things[thing] === undefined) {
        deleted.push(+thing);
      } else if (JSON.stringify(oldState.things[thing]) !== JSON.stringify(newState.things[thing])) {
        changed.push(+thing);
      }
    }
  }

  for (const thing in newState.things) {
    if (oldState.things[thing] === undefined) {
      added.push(+thing);
    }
  }

  return {added, deleted, changed};
}

function useStateContext(initialState: Things): StateContext {
  const [state, setLocalState] = React.useState(initialState);

  const batched = useBatched(200);

  function setContent(thing: number, content: string): void {
    setLocalState(Data.setContent(state, thing, content));
    batched.update(`${thing}/content`, () => { Server.setContent(thing, content) });
  }

  function setPage(thing: number, page: string): void {
    setLocalState(Data.setPage(state, thing, page));
    batched.update(`${thing}/page`, () => { Server.setPage(thing, page) });
  }

  function removePage(thing: number): void {
    setLocalState(Data.removePage(state, thing));
    Server.removePage(thing);
  }

  // TODO: setState and undo should override timeouts from setContent.

  function setState(newState: Things): void {
    if (newState !== state) {
      undo.pushState(state);
      setLocalState(newState);

      const diff = diffState(state, newState);
      for (const thing of diff.deleted) {
        Server.deleteThing(thing);
      }
      for (const thing of [...diff.added, ...diff.changed]) {
        Server.putThing(thing, newState.things[thing]);
      }

      if (newState.next !== state.next)
        Server.putNext(newState.next);
    }
  }

  function undo_(): void {
    const oldState = undo.popState();
    if (oldState === null) {
      console.log("Can't undo further");
      return;
    }
    setLocalState(oldState);
    Server.putData(oldState);
  }

  return {state, setState, setLocalState, setContent, undo: undo_, setPage, removePage};
}

function App({initialState, username}: {initialState: Things; username: string}) {
  const [selectedThing, setSelectedThing_] = React.useState(extractThingFromURL());
  function setSelectedThing(thing: number): void {
    // TODO: Update title?
    setSelectedThing_(thing);
    window.history.pushState(undefined, document.title, `#${thing}`);
  }

  // TODO: We should manage this in a cleaner way, in case anyone else also
  // wants to set onpopstate.
  window.onpopstate = (ev) => {
    setSelectedThing_(extractThingFromURL());
  };

  const context = useStateContext(initialState);

  // If the same user is connected through multiple clients, we want to be able
  // to see changes from other clients on this one.
  //
  // The server gives us /api/changes, which returns true when there are pending
  // changes from another client. We poll for such changes regularly, and when
  // changes are found, update the local state. The polling interval is
  // dynamically adjusted to avoid polling very frequently when we don't expect
  // to see any changes.

  React.useEffect(() => {
    let timesSinceLastChange = 0;
    function callback(ms: number): void {
      setTimeout(async () => {
        const hasChanges = await Server.hasChanges();
        if (hasChanges) {
          timesSinceLastChange = 0;
          await Server.polledChanges();
          context.setLocalState(await Server.getData());
        } else {
          timesSinceLastChange++;
        }
        callback(Math.min(timesSinceLastChange * 100 + 500, 10000));
      }, ms);
    }
    callback(5000);
  }, []);

  document.onkeydown = (ev) => {
    if (ev.key === "z" && ev.ctrlKey) {
      console.log("Undoing");
      context.undo();
      ev.preventDefault();
    }
  };

  return <>
    <div id="current-user"><span className="username">{username}</span> <a className="log-out" href="/logout">log out</a></div>
    <ThingOverview context={context} selectedThing={selectedThing} setSelectedThing={setSelectedThing}/>
  </>;
}

function ThingOverview(p: {context: StateContext; selectedThing: number; setSelectedThing(value: number): void}) {
  return (
    <div className="overview">
      <ParentsOutline context={p.context} child={p.selectedThing} setSelectedThing={p.setSelectedThing}/>
      <PlainText
        className="selected-content"
        text={Data.content(p.context.state, p.selectedThing)}
        setText={(text) => { p.context.setContent(p.selectedThing, text) }}/>
      <PageView context={p.context} thing={p.selectedThing}/>
      <div className="children">
        <Outline context={p.context} root={p.selectedThing} setSelectedThing={p.setSelectedThing}/>
      </div>
    </div>);
}

function ParentsOutline(p: {context: StateContext; child: number; setSelectedThing: SetSelectedThing}) {
  function ParentItem(p: {context: StateContext; parent: number; setSelectedThing: SetSelectedThing}) {
    const [tree, setTree] = React.useState(T.fromRoot(p.context.state, p.parent));
    const [drag, setDrag] = React.useState({current: null, target: null} as DragInfo);
    const treeContext = {...p.context, tree, setTree, drag, setDrag, setSelectedThing: p.setSelectedThing};
    return <ExpandableItem id={0} context={treeContext}/>;
  }

  const parentLinks = Data.parents(p.context.state, p.child).map((parent: number) => {
    return <ParentItem key={parent} context={p.context} parent={parent} setSelectedThing={p.setSelectedThing}/>;
  });

  if (parentLinks.length === 0) {
    return <span className="parents"><span className="no-parents">No parents</span></span>;
  } else {
    return <span className="parents"><ul className="outline-tree">{parentLinks}</ul></span>;
  }
}

function PageView(p: {context: StateContext; thing: number}) {
  const page = Data.page(p.context.state, p.thing);

  if (Data.page(p.context.state, p.thing) === null) {
    return <button onClick={() => { p.context.setPage(p.thing, "") }} className="new-page">Create Page</button>;
  }

  function onKeyDown(ev: React.KeyboardEvent<{}>): boolean {
    if (ev.key === "Delete" && ev.altKey) {
      p.context.removePage(p.thing);
      return true;
    }
    return false;
  }

  return (
    <PlainText
      className="page"
      placeholder="Empty Page"
      text={page ?? ""}
      setText={(text) => { p.context.setPage(p.thing, text) }}
      onKeyDown={onKeyDown}/>
  );
}

function Outline(p: {context: StateContext; root: number; setSelectedThing: SetSelectedThing}) {
  // To simulate multiple top-level items, we just assign a thing as the root,
  // and use its children as the top-level items. This is a bit of a hack. We
  // should probably do something smarter.
  const [tree, setTree] = React.useState(T.expand(p.context.state, T.fromRoot(p.context.state, p.root), 0));

  React.useEffect(() => {
    setTree(T.refresh(tree, p.context.state));
  }, [p.context.state]);

  React.useEffect(() => {
    setTree(T.expand(p.context.state, T.fromRoot(p.context.state, p.root), 0));
  }, [p.root]);

  const [drag, setDrag] = React.useState({current: null, target: null} as DragInfo);

  const context: TreeContext = {...p.context, tree, setTree, drag, setDrag, setSelectedThing: p.setSelectedThing};

  return (
    <Subtree context={context} parent={0}>
      { T.children(tree, 0).length === 0 && <PlaceholderItem context={context} parent={0}/> }
    </Subtree>
  );
}

function PlaceholderItem(p: {context: TreeContext; parent: number}) {
  function onFocus(ev: React.FocusEvent<HTMLInputElement>): void {
    const [newState, newTree, _, newId] = T.createChild(p.context.state, p.context.tree, 0);
    p.context.setState(newState);
    p.context.setTree(T.focus(newTree, newId));
    ev.stopPropagation();
    ev.preventDefault();
  }

  return (
    <li className="outline-item">
      <span className="item-line">
        <Bullet page={false} beginDrag={() => { return }} expanded={true} toggle={() => { return }}/>
        <input className="content" value={""} readOnly placeholder={"New Item"} onFocus={onFocus}/>
      </span>
    </li>
  );
}

function ExpandableItem(p: {context: TreeContext; id: number}) {
  function toggle() {
    p.context.setTree(T.toggle(p.context.state, p.context.tree, p.id));
  }

  const expanded = T.expanded(p.context.tree, p.id);

  function beginDrag() {
    p.context.setDrag({current: p.id, target: null});
  }

  function onMouseUp(ev: React.MouseEvent<HTMLElement>): void {
    if (p.context.drag.current !== null && p.context.drag.target !== null && p.context.drag.current !== p.id) {
      if (ev.ctrlKey) {
        const [newState, newTree, newId] = T.copyToAbove(p.context.state, p.context.tree, p.context.drag.current, p.context.drag.target);
        p.context.setState(newState);
        p.context.setTree(T.focus(newTree, newId));
      } else {
        const [newState, newTree] = T.moveToAbove(p.context.state, p.context.tree, p.context.drag.current, p.context.drag.target);
        p.context.setState(newState);
        p.context.setTree(newTree);
      }
    }

    ev.preventDefault();
    p.context.drag.current = null;
  }

  window.addEventListener("mouseup", () => {p.context.drag.current = null}, {once: true});

  function onMouseEnter(ev: React.MouseEvent<HTMLElement>): void {
    if (p.context.drag.current === p.id) {
      p.context.setDrag({...p.context.drag, target: null});
    } else {
      p.context.setDrag({...p.context.drag, target: p.id});
    }
    ev.stopPropagation();
  }

  let className = "item-line";
  if (p.context.drag.current !== null && p.context.drag.target === p.id)
    className += " drop-target";
  if (p.context.drag.current === p.id && p.context.drag.target !== null)
    className += " drag-source";

  const subtree =
    <Subtree
      context={p.context}
      parent={p.id}/>;

  return (
    <li className="outline-item" onMouseOver={onMouseEnter} onMouseUp={onMouseUp}>
      <span className={className}>
        <Bullet
          beginDrag={beginDrag}
          expanded={T.expanded(p.context.tree, p.id)}
          toggle={toggle}
          page={Data.page(p.context.state, T.thing(p.context.tree, p.id)) !== null}
          onMiddleClick={() => { p.context.setSelectedThing(T.thing(p.context.tree, p.id)) }}/>
        <Content context={p.context} id={p.id}/>
      </span>
      { expanded && subtree }
    </li>
  );
}

function Bullet(p: {expanded: boolean; page: boolean; toggle: () => void; beginDrag: () => void; onMiddleClick?(): void}) {
  function onAuxClick(ev: React.MouseEvent<never>): void {
    if (ev.button === 1) { // Middle click
      if (p.onMiddleClick !== undefined)
        p.onMiddleClick();
    }
  }

  return (
    <span
      className={`bullet ${p.expanded ? "expanded" : "collapsed"}${p.page ? "-page" : ""}`}
      onMouseDown={p.beginDrag}
      onClick={() => p.toggle()}
      onAuxClick={onAuxClick}/>
  );
}

function Content(p: {context: TreeContext; id: number}) {
  function onKeyDown(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean {
    if (ev.key === "ArrowRight" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.indent(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "ArrowLeft" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.unindent(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "ArrowDown" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.moveDown(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "ArrowUp" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.moveUp(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "Tab") {
      p.context.setTree(T.toggle(p.context.state, p.context.tree, p.id));
      return true;
    } else if (ev.key === "ArrowUp") {
      p.context.setTree(T.focusUp(p.context.tree));
      return true;
    } else if (ev.key === "ArrowDown") {
      p.context.setTree(T.focusDown(p.context.tree));
      return true;
    } else if (ev.key === "Enter" && ev.altKey) {
      const [newState, newTree, _, newId] = T.createChild(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(T.focus(newTree, newId));
      return true;
    } else if (ev.key === "Enter" && ev.ctrlKey) {
      const [newState, newTree, _, newId] = T.createSiblingAfter(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(T.focus(newTree, newId));
      return true;
    } else if (ev.key === "Enter" && !ev.shiftKey) {
      if (notes.endOfItem) {
        const [newState, newTree, _, newId] = T.createSiblingAfter(p.context.state, p.context.tree, p.id);
        p.context.setState(newState);
        p.context.setTree(T.focus(newTree, newId));
        return true;
      } else if (notes.startOfItem) {
        const [newState, newTree, _, newId] = T.createSiblingBefore(p.context.state, p.context.tree, p.id);
        p.context.setState(newState);
        p.context.setTree(T.focus(newTree, newId));
        return true;
      } else {
        return false;
      }
    } else if (ev.key === "Backspace" && ev.altKey) {
      const [newState, newTree] = T.remove(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      return true;
    } else if (ev.key === "Delete" && ev.altKey) {
      const newState = Data.remove(p.context.state, T.thing(p.context.tree, p.id));
      p.context.setState(newState);
      return true;
    } else {
      return false;
    }
  }

  const ref: React.MutableRefObject<HTMLElement | null> = React.useRef(null);

  React.useEffect(() => {
    if (T.hasFocus(p.context.tree, p.id))
      ref.current?.focus();
  }, [ref, p.context.tree]);

  return (
    <PlainText
      ref={ref}
      className="content"
      text={Data.content(p.context.state, T.thing(p.context.tree, p.id))}
      setText={(text) => { p.context.setContent(T.thing(p.context.tree, p.id), text) }}
      onFocus={() => { p.context.setTree(T.focus(p.context.tree, p.id)) }}
      onKeyDown={onKeyDown}/>
  );
}

function Subtree(p: {context: TreeContext; parent: number; children?: React.ReactNode[] | React.ReactNode}) {
  const children = T.children(p.context.tree, p.parent).map(child => {
    return <ExpandableItem key={child} id={child} context={p.context}/>;
  });

  return <ul className="outline-tree">{children}{p.children}</ul>;
}

// ==

async function start(): Promise<void> {
  ReactDOM.render(
    <App initialState={Data.cleanGarbage(await Server.getData() as Things, 0)} username={await Server.getUsername()}/>,
    document.querySelector("#app")
  );
}

start();
