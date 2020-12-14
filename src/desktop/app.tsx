import * as Electron from "electron";
import * as ReactDOM from "react-dom";
import * as React from "react";
import * as Thinktool from "@thinktool/client";

import * as SqliteStorage from "./sqlite-storage";

(async () => {
  const path = await Electron.ipcRenderer.invoke("open-file");

  const storage = path == undefined ? Thinktool.Storage.ignore() : await SqliteStorage.initialize(path);

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
        {...attrs}
      >
        {props.children}
      </a>
    );
  }

  function openExternalUrl(url: string) {
    Electron.shell.openExternal(url);
  }

  ReactDOM.render(
    <Thinktool.LocalApp storage={storage} ExternalLink={ExternalLink} openExternalUrl={openExternalUrl} />,
    document.getElementById("app"),
  );
})();
