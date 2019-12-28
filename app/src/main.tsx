import {Things} from "./data";
import * as data from "./data";
import * as server from "./server-api";

import * as React from "react";
import * as ReactDOM from "react-dom";

type SetContent = (thing: number, newContent: string) => void;

class Content extends React.Component<{state: Things; thing: number; setContent: SetContent}, {}> {
  private content(): string {
    return data.content(this.props.state, this.props.thing);
  }

  render(): React.ReactNode {
    return <input
      className="content"
      value={this.content()}
      onChange={(ev: React.ChangeEvent<HTMLInputElement>) => this.props.setContent(this.props.thing, ev.target.value)}/>;
  }
}

// Subtree, not including the parent itself.
class Subtree extends React.Component<{state: Things; parent: number; setContent: SetContent}, {}> {
  render(): React.ReactNode {
    let i = 0;
    const children = data.children(this.props.state, this.props.parent).map(child => {
      return <ExpandableItem
        key={i++}
        state={this.props.state}
        thing={child}
        setContent={this.props.setContent}/>;
    });
    return <ul className="outline-tree">{children}</ul>;
  }
}

class Bullet extends React.Component<{expanded: boolean; setExpanded(expanded: boolean): void}, {}> {
  private toggle(): void {
    this.props.setExpanded(!this.props.expanded);
  }

  render(): React.ReactNode {
    return <span
      className={`bullet ${this.props.expanded ? "expanded" : "collapsed"}`}
      onClick={this.toggle.bind(this)}/>;
  }
}

class ExpandableItem extends React.Component<{state: Things; thing: number; setContent: SetContent}, {expanded: boolean}> {
  constructor(props: {state: Things; thing: number; setContent: SetContent}) {
    super(props);
    this.state = {expanded: false};
  }

  render(): React.ReactNode {
    const subtree =
      <Subtree
        state={this.props.state}
        parent={this.props.thing}
        setContent={this.props.setContent}/>;

    return <li className="outline-item">
      <Bullet expanded={this.state.expanded} setExpanded={(expanded: boolean) => this.setState({expanded}) }/>
      <Content
        state={this.props.state}
        thing={this.props.thing}
        setContent={this.props.setContent}/>
      { (() => { if (this.state.expanded) return subtree; })() }
    </li>;
  }
}

class Outline extends React.Component<{state: Things; root: number; setContent: SetContent}, {}> {
  render(): React.ReactNode {
    return <ul className="outline-tree outline-root-tree">
      <ExpandableItem
        state={this.props.state}
        thing={this.props.root}
        setContent={this.props.setContent}/>
    </ul>;
  }
}

class App extends React.Component<{initialState: Things}, {state: Things}> {
  constructor(props: {initialState: Things}) {
    super(props);

    this.state = {state: this.props.initialState};
  }

  private async setContent(thing: number, newContent: string): Promise<void> {
    // TODO: We should make 'data' module use immutable data structures, which we want to do anyway.
    data.setContent(this.state.state, thing, newContent);
    this.setState({state: this.state.state});
    await server.putData(this.state.state);
  }

  render(): React.ReactNode {
    return <div>
      <Outline
        state={this.state.state}
        root={5}
        setContent={this.setContent.bind(this)}/>
    </div>;
  }
}

async function start(): Promise<void> {
  ReactDOM.render(
    <App initialState={await server.getData() as Things}/>,
    document.querySelector("#app")
  );
}

start();
