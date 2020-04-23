import * as D from "../data";
import * as React from "react";
import ThingSelectPopup from "./ThingSelectPopup";

interface Context {
  state: D.State;
  setState(state: D.State): void;
  setSelectedThing(value: string): void;
}

export default function Search(props: {context: Context}) {
  const [showPopup, setShowPopup] = React.useState(false);

  return (
    <>
      <button className="search" onClick={() => setShowPopup(true)}>
        Find
      </button>
      {showPopup && (
        <ThingSelectPopup
          state={props.context.state}
          create={(content: string) => {
            const [state0, thing] = D.create(props.context.state);
            const state1 = D.setContent(state0, thing, content);
            props.context.setState(state1);
            props.context.setSelectedThing(thing);
          }}
          submit={(thing) => props.context.setSelectedThing(thing)}
          hide={() => setShowPopup(false)}
        />
      )}
    </>
  );
}
