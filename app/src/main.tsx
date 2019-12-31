import {Things} from "./data";
import {Tree} from "./tree";

import * as Data from "./data";
import * as T from "./tree";
import * as Server from "./server-api";

import * as React from "react";
import * as ReactDOM from "react-dom";

// ==

interface TreeContext {
  tree: Tree;
  setTree(value: Tree): void;
  state: Things;
  setState(value: Things): void;
}

// == Components ==

function App({initialState}: {initialState: Things}) {
  const [state, setState_] = React.useState(initialState);
  function setState(newState: Things): void {
    Server.putData(newState);
    setState_(newState);
  }

  return <>
    <Outline state={state} setState={setState} thing={5}/>
    <Outline state={state} setState={setState} thing={5}/>
    <Outline state={state} setState={setState} thing={2}/>
  </>;
}

function Outline(p: {state: Things; setState(value: Things): void; thing: number}) {
  const [tree, setTree] = React.useState(T.fromRoot(p.state, p.thing));

  React.useEffect(() => {
    setTree(T.refresh(tree, p.state));
  }, [p.state]);

  const context: TreeContext = {state: p.state, setState: p.setState, tree, setTree};

  return <ul className="outline-tree outline-root-tree">
    <ExpandableItem context={context} id={context.tree.root}/>
  </ul>;
}

function ExpandableItem(p: {context: TreeContext; id: number}) {
  const {tree, setTree, state, setState} = p.context;

  function toggle() {
    setTree(T.toggle(state, tree, p.id));
  }

  const expanded = T.expanded(tree, p.id);

  const subtree =
    <Subtree
      context={p.context}
      parent={p.id}/>;

  return <li className="outline-item">
    <Bullet expanded={T.expanded(tree, p.id)} toggle={toggle}/>
    <Content context={p.context} id={p.id}/>
    { expanded && subtree }
  </li>;
}

function Bullet(p: {expanded: boolean; toggle: () => void}) {
  return (
    <span
      className={`bullet ${p.expanded ? "expanded" : "collapsed"}`}
      onClick={() => p.toggle()}/>
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
    } else if (ev.key === "Tab") {
      p.context.setTree(T.toggle(p.context.state, p.context.tree, p.id));
      ev.preventDefault();
    }
  }

  return (
    <input
      className="content"
      value={Data.content(p.context.state, T.thing(p.context.tree, p.id))}
      onChange={setContent}
      onKeyDown={onKeyDown}/>
  );
}

function Subtree(p: {context: TreeContext; parent: number}) {
  const children = T.children(p.context.tree, p.parent).map(child => {
    return <ExpandableItem key={child} id={child} context={p.context}/>;
  });

  return <ul className="outline-tree">{children}</ul>;
}

// ==

async function start(): Promise<void> {
  ReactDOM.render(
    <App initialState={await Server.getData() as Things}/>,
    document.querySelector("#app")
  );
}

start();
