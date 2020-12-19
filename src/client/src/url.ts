import * as React from "react";
import * as T from "./tree";

export function useThingUrl(args: {current: string; jump: (thing: string) => void}) {
  React.useEffect(() => {
    // TODO: We should manage this in a cleaner way, in case anyone else also
    // wants to set onpopstate.
    window.onpopstate = (ev: PopStateEvent) => {
      args.jump(extractThingFromURL());
    };

    return () => {
      console.error("Unmounting history manager. This should never happen!");
    };
  }, []);

  React.useEffect(() => {
    // TODO: Update title here as well?
    window.history.pushState(undefined, document.title, `#${args.current}`);
  }, [args.current]);
}

export function extractThingFromURL(): string {
  if (window.location.hash.length > 0) {
    const thing = window.location.hash.slice(1);
    return thing;
  } else {
    // By default, use thing #0. We should probably do something smarter here,
    // like allow the user to set a deafult thing.
    return "0";
  }
}
