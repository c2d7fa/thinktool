import * as React from "react";

export function useThingUrl(args: {current: string; jump: (thing: string) => void}) {
  React.useEffect(() => {
    // TODO: We should manage this in a cleaner way, in case anyone else also
    // wants to set onpopstate.
    window.onpopstate = () => {
      args.jump(extractThingFromURL());
    };

    return () => {
      console.error("Unmounting history manager. This should never happen!");
    };
  }, []);

  React.useEffect(() => {
    if (window.location.hash === `#${args.current}` || (window.location.hash === "" && args.current === "0"))
      return; // URL is already correct.

    if (args.current === "0") {
      // Default. Remove hash part of URL.
      window.history.pushState(undefined, document.title, window.location.pathname);
      return;
    }

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
