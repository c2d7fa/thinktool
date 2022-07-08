import * as React from "react";
import {Send} from "./app";

export function useThingUrl(args: {current: string; send: Send}) {
  React.useEffect(() => {
    // TODO: We should manage this in a cleaner way, in case anyone else also
    // wants to set onpopstate.
    window.onpopstate = () => {
      args.send({type: "urlChanged", hash: window.location.hash});
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
