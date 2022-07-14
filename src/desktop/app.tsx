import * as Electron from "electron";
import * as ReactDOM from "react-dom";
import * as React from "react";
import * as Thinktool from "@thinktool/client";

import * as SqliteStorage from "./sqlite-storage";

function nullStorage(): Thinktool.Storage {
  return {
    async getFullState() {
      return {things: [{name: "0", content: ["Unsaved File"], children: []}]};
    },
    async setContent() {},
    async deleteThing() {},
    async updateThings() {},
    async getTutorialFinished() {
      return false;
    },
    async setTutorialFinished() {},
  };
}

(async () => {
  const path = await Electron.ipcRenderer.invoke("open-file");

  const storage = path == undefined ? nullStorage() : await SqliteStorage.initialize(path);

  function openExternalUrl(url: string) {
    Electron.shell.openExternal(url);
  }

  ReactDOM.render(
    <Thinktool.App remote={storage} openExternalUrl={openExternalUrl} />,
    document.getElementById("app"),
  );
})();
