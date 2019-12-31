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
    <button onClick={() => { setState_(Data.addChild(state, 5, 2)) }}>Test Update</button>
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
    // Can't collapse item without children
    if (Data.hasChildren(state, T.thing(tree, p.id)))
      setTree(T.toggle(state, tree, p.id));
  }

  const expanded = T.expanded(tree, p.id);

  const subtree =
    <Subtree
      context={p.context}
      parent={p.id}/>;

  return <li className="outline-item">
    <Bullet expanded={T.expanded(tree, p.id)} toggle={toggle}/>
    <Content tree={tree} state={state} setState={setState} id={p.id}/>
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

function Content(p: {tree: Tree; state: Things; setState: (state: Things) => void; id: number}) {
  function setContent(ev: React.ChangeEvent<HTMLInputElement>): void {
    p.setState(Data.setContent(p.state, T.thing(p.tree, p.id), ev.target.value));
  }

  return (
    <input
      className="content"
      value={Data.content(p.state, T.thing(p.tree, p.id))}
      onChange={setContent}/>
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
