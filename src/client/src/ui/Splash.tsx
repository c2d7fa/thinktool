import * as React from "react";

// I don't think "splash screen" is exactly the right terminology for this. It's
// the thing that pops up when a user first logs in and explains a bit about our
// features and how to get started.

export default function Splash(props: {splashCompleted(): void}) {
  return (
    <div className="splash-outer">
      <div className="splash-main">
        <div>Hello, this is the so-called splash screen.</div>
        <button onClick={() => props.splashCompleted()}>Very cool</button>
      </div>
    </div>
  );
}
