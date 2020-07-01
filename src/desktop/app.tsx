import * as Electron from "electron";

import * as Client from "thinktool-client";
const React = Client.React; // If we try to use our own React, we get an error when building.

function ExternalLink(props: {href: string; children: React.ReactNode; [k: string]: any}) {
  return <span style={{color: "#ccc"}}>{props.href}</span>;
}

const storage = Electron.remote.getGlobal("storage") as Client.Storage.Storage;
Client.startLocalApp({storage, ExternalLink});
