import * as Electron from "electron";

import * as Client from "thinktool-client";
const React = Client.React; // If we try to use our own React, we get an error when building.

function ExternalLink(props: {href: string; children: React.ReactNode; [k: string]: any}) {
  const attrs: object = {...props};
  delete (attrs as any).href;
  delete (attrs as any).children;

  // Links are relative to https://thinktool.io/ unless otherwise specified.
  const actualHref = props.href[0] === "/" ? "https://thinktool.io" + props.href : props.href;

  return (
    <a
      href="#"
      onClick={() => {
        console.log("Opening %o in external", actualHref);
        Electron.shell.openExternal(actualHref);
      }}
      {...attrs}>
      {props.children}
    </a>
  );
}

const storage = Electron.remote.getGlobal("storage") as Client.Storage.Storage;
Client.startLocalApp({storage, ExternalLink});
