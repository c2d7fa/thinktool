import * as Client from "thinktool-client";
import * as Electron from "electron";

console.log("Starting Thinktool desktop application...");

// Get rid of warning about the default value of allowRenderProcessReuse being
// deprecated. We don't care about its value.
Electron.app.allowRendererProcessReuse = true;

Electron.app.whenReady().then(() => {
  const window = new Electron.BrowserWindow({});

  window.loadFile("index.html");
});

console.log(Client.thinktoolApp);
