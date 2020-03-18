import * as D from "../data";
import * as React from "react";
import ThingSelectPopup from "./ThingSelectPopup";

interface Context {
  state: D.State;
  setSelectedThing(value: string): void;
}

export default function Search(props: {context: Context}) {
  const [showPopup, setShowPopup] = React.useState(false);

  return <>
    <button className="search" onClick={() => setShowPopup(true)}>Search items</button>
    {showPopup && <ThingSelectPopup state={props.context.state} submit={thing => props.context.setSelectedThing(thing)} hide={() => setShowPopup(false)}/>}
  </>;
}
