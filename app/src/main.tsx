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

  // Like setState, but won't update undo and server state when setting
  // consecutive states in the same group within a short time interval.
  setGroupedState(group: string, value: Things): void;
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

  const [state, setLocalState] = React.useState(initialState);

  const lastGroup: React.MutableRefObject<string | null> = React.useRef(null);
  const lastUpdateForGroup: React.MutableRefObject<number | null> = React.useRef(null);
  const stateUpdateTimeout: React.MutableRefObject<number | null> = React.useRef(null);

  function setState(newState: Things): void {
    if (stateUpdateTimeout.current !== null) {
      window.clearTimeout(stateUpdateTimeout.current);
      stateUpdateTimeout.current = null;
    }

    if (newState !== state) {
      undo.pushState(state);
      Server.putData(newState);
      setLocalState(newState);
    }
  }

  function setGroupedState(group: string, newState: Things): void {
    if (stateUpdateTimeout.current !== null) {
      window.clearTimeout(stateUpdateTimeout.current);
      stateUpdateTimeout.current = null;
    }

    if (lastGroup.current !== null && lastGroup.current === group) {
      // Same as last group, just set local state unless a long time has elapsed
      if (Date.now() - lastUpdateForGroup.current >= 1000) {
        // The last time we updated the state for this group was >1s ago, so
        // update it now.
        setState(newState);
        lastUpdateForGroup.current = Date.now();
      } else {
        setLocalState(newState);

        // If there are no more writes to this group, we still want to send the
        // state update eventually.
        stateUpdateTimeout.current = window.setTimeout(() => {
          console.log("Setting state due to timeout");
          setState(newState);
        }, 10000);
      }
    } else {
      // Changing group, actually update state
      setState(newState);
      lastUpdateForGroup.current = Date.now();
      lastGroup.current = group;
    }
  }

  document.onkeydown = (ev) => {
    if (ev.key === "z" && ev.ctrlKey) {
      // Undo
      console.log("Undoing");
      const oldState = undo.popState();
      if (oldState === null) {
        console.log("Can't undo further");
        return;
      }
      setLocalState(oldState);
      lastGroup.current = null;
      Server.putData(oldState);
      ev.preventDefault();
    }
  };

  window.onbeforeunload = () => {
    Server.putData(state);
  };

  return <>
    <div id="current-user"><span className="username">{username}</span> (<a className="log-out" href="/logout">log out</a>)</div>
    <ThingOverview context={{state, setState, setGroupedState}} selectedThing={selectedThing} setSelectedThing={setSelectedThing}/>
  </>;
}

function ThingOverview(p: {context: StateContext; selectedThing: number; setSelectedThing(value: number): void}) {
  return (
    <div className="overview">
      <ParentsOutline context={p.context} child={p.selectedThing} setSelectedThing={p.setSelectedThing}/>
      <PlainText
        className="selected-content"
        text={Data.content(p.context.state, p.selectedThing)}
        setText={(text) => { p.context.setState(Data.setContent(p.context.state, p.selectedThing, text)) }}/>
      <PageView context={p.context} thing={p.selectedThing}/>
      <div className="children">
        <Outline context={p.context} root={p.selectedThing} setSelectedThing={p.setSelectedThing}/>
      </div>
    </div>);
}

function ParentsOutline(p: {context: StateContext; child: number; setSelectedThing: SetSelectedThing}) {
  const parentLinks = Data.parents(p.context.state, p.child).map((parent: number) => {
    const [tree, setTree] = React.useState(T.fromRoot(p.context.state, parent));
    const [drag, setDrag] = React.useState({current: null, target: null});
    const treeContext = {...p.context, tree, setTree, drag, setDrag, setSelectedThing: p.setSelectedThing};
    return <ExpandableItem key={parent} id={0} context={treeContext}/>;
    return <a key={parent} className="thing-link" href={`#${parent}`}>{Data.content(p.context.state, parent)}</a>;
  });

  if (parentLinks.length === 0) {
    return <span className="parents"><span className="no-parents">&mdash;</span></span>;
  } else {
    return <span className="parents"><ul className="outline-tree">{parentLinks}</ul></span>;
  }
}

function PageView(p: {context: StateContext; thing: number}) {
  const page = Data.page(p.context.state, p.thing);

  function setPage(page: string): void {
    p.context.setState(Data.setPage(p.context.state, p.thing, page));
  }

  if (Data.page(p.context.state, p.thing) === null) {
    return <button onClick={() => { setPage("") }} className="new-page">Create Page</button>;
  }

  function onKeyDown(ev: React.KeyboardEvent<{}>): boolean {
    if (ev.key === "Delete" && ev.altKey) {
      p.context.setState(Data.removePage(p.context.state, p.thing));
      return true;
    }

    return false;
  }

  return (
    <PlainText
      className="page"
      placeholder="(Empty page)"
      text={page}
      setText={setPage}
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

  const [drag, setDrag] = React.useState({current: null, target: null});

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
    if (p.context.drag.current !== null && p.context.drag.current !== p.id) {
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
  function setContent(text: string): void {
    const newState = Data.setContent(p.context.state, T.thing(p.context.tree, p.id), text);
    p.context.setGroupedState(`content-tree-${p.id}`, newState);
  }

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

  const ref: React.MutableRefObject<HTMLElement> = React.useRef();

  React.useEffect(() => {
    if (T.hasFocus(p.context.tree, p.id))
      ref.current.focus();
  }, [ref, p.context.tree]);

  return (
    <PlainText
      ref={ref}
      className="content"
      text={Data.content(p.context.state, T.thing(p.context.tree, p.id))}
      setText={setContent}
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
