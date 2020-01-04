import {Things} from "./data";
import {Tree} from "./tree";

import * as Data from "./data";
import * as T from "./tree";
import * as Server from "./server-api";

import * as React from "react";
import * as ReactDOM from "react-dom";

// ==

interface DragInfo {
  current: number | null;
  target: number | null;
}

interface StateContext {
  state: Things;
  setState(value: Things): void;
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

function App({initialState, root}: {initialState: Things; root: number}) {
  const [state, setState_] = React.useState(initialState);
  function setState(newState: Things): void {
    Server.putData(newState);
    setState_(newState);
  }

  return <ThingOverview context={{state, setState}} initialThing={root}/>;
}

function ThingOverview(p: {context: StateContext; initialThing: number}) {
  const [selectedThing, setSelectedThing] = React.useState(p.initialThing);

  return (
    <div className="overview">
      <h1>{Data.content(p.context.state, selectedThing)}</h1>
      <p>
        You are currently looking at the thing called <strong>{Data.content(p.context.state, selectedThing)}</strong>,
        which has ID <strong>{selectedThing}</strong>. The following is a list of its children:
      </p>
      <Outline context={p.context} root={selectedThing} setSelectedThing={setSelectedThing}/>
    </div>);
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
        <Bullet beginDrag={() => { return }} expanded={true} toggle={() => { return }}/>
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
          onMiddleClick={() => { p.context.setSelectedThing(T.thing(p.context.tree, p.id)) }}/>
        <Content context={p.context} id={p.id}/>
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
      onClick={() => p.toggle()}
      onAuxClick={onAuxClick}/>
  );
}

function Content(p: {context: TreeContext; id: number}) {
  function setContent(ev: React.ChangeEvent<HTMLInputElement>): void {
    p.context.setState(Data.setContent(p.context.state, T.thing(p.context.tree, p.id), ev.target.value));
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>): void {
    if (ev.key === "ArrowRight" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.indent(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      ev.preventDefault();
    } else if (ev.key === "ArrowLeft" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.unindent(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      ev.preventDefault();
    } else if (ev.key === "ArrowDown" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.moveDown(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      ev.preventDefault();
    } else if (ev.key === "ArrowUp" && ev.altKey && ev.ctrlKey) {
      const [newState, newTree] = T.moveUp(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      ev.preventDefault();
    } else if (ev.key === "Tab") {
      p.context.setTree(T.toggle(p.context.state, p.context.tree, p.id));
      ev.preventDefault();
    } else if (ev.key === "ArrowUp") {
      p.context.setTree(T.focusUp(p.context.tree));
      ev.preventDefault();
    } else if (ev.key === "ArrowDown") {
      p.context.setTree(T.focusDown(p.context.tree));
      ev.preventDefault();
    } else if (ev.key === "Enter" && ev.shiftKey) {
      const [newState, newTree, _, newId] = T.createChild(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(T.focus(newTree, newId));
      ev.preventDefault();
    } else if (ev.key === "Enter") {
      const [newState, newTree, _, newId] = T.createSiblingAfter(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(T.focus(newTree, newId));
      ev.preventDefault();
    } else if (ev.key === "Backspace" && ev.altKey) {
      const [newState, newTree] = T.remove(p.context.state, p.context.tree, p.id);
      p.context.setState(newState);
      p.context.setTree(newTree);
      ev.preventDefault();
    } else if (ev.key === "Delete" && ev.altKey) {
      const newState = Data.remove(p.context.state, T.thing(p.context.tree, p.id));
      p.context.setState(newState);
      ev.preventDefault();
    }
  }

  const inputRef: React.MutableRefObject<HTMLInputElement> = React.useRef(null);

  React.useEffect(() => {
    if (T.hasFocus(p.context.tree, p.id))
      inputRef.current.focus();
  }, [inputRef, p.context.tree]);

  return (
    <input
      ref={inputRef}
      size={Data.content(p.context.state, T.thing(p.context.tree, p.id)).length + 1}
      className="content"
      value={Data.content(p.context.state, T.thing(p.context.tree, p.id))}
      onFocus={() => { p.context.setTree(T.focus(p.context.tree, p.id)) }}
      onChange={setContent}
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
    <App initialState={Data.cleanGarbage(await Server.getData() as Things, 0)} root={0}/>,
    document.querySelector("#app")
  );
}

start();
