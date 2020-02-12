import * as D from "../data";
import * as React from "react";

interface StateContext {
  state: D.Things;
}

export default function Search(props: {context: StateContext}) {
  const [searchText, setSearchText] = React.useState("");

  return (
    <div className="search">
      { /* TODO: Since onBlur is triggered before the link is clicked, we have it on a timeout as a workaround. We can surely do something better here. Also, this seems to be related to a React error. */ }
      <input value={searchText} onChange={ev => setSearchText(ev.target.value)} placeholder="Search for content..." onBlur={() => setTimeout(() => setSearchText(""), 75)}/>
      { searchText !== "" && <SearchResults context={props.context} searchText={searchText}/> }
    </div>
  );
}

function SearchResults(props: {searchText: string; context: StateContext}) {

  let i = 0;
  return (
    <ul className="search-results">
      {D.search(props.context.state, props.searchText).map(thing => <Result key={i++} context={props.context} thing={thing}/>)}
    </ul>
  );
}

function Result(props: {thing: string; context: StateContext}) {
  return <a href={`#${props.thing}`}><li className="search-result">{D.content(props.context.state, props.thing)}</li></a>;
}
