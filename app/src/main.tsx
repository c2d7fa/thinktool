import {Things} from "./data";
import * as Data from "./data";
import * as Tree from "./tree";
import * as Server from "./server-api";

import * as React from "react";
import * as ReactDOM from "react-dom";

// == Components ==

function App({initialState}: {initialState: Things}) {
  const [state, setState_] = React.useState(initialState);
  function setState(newState: Things): void {
    Server.putData(newState);
    setState_(newState);
  }
  const [tree, setTree] = React.useState(Tree.fromRoot(initialState, 5));

  return <Content tree={tree} state={state} setState={setState} id={0}></Content>;
}

function Content(p: {tree: Tree.Tree; state: Things; setState: (state: Things) => void; id: number}) {
  function setContent(ev: React.ChangeEvent<HTMLInputElement>): void {
    p.setState(Data.setContent(p.state, Tree.thing(p.state, p.tree, p.id), ev.target.value));
  }

  return (
    <input
      className="content"
      value={Data.content(p.state, Tree.thing(p.state, p.tree, p.id))}
      onChange={setContent}/>
  );
}

// ==

async function start(): Promise<void> {
  ReactDOM.render(
    <App initialState={await Server.getData() as Things}/>,
    document.querySelector("#app")
  );
}

start();
