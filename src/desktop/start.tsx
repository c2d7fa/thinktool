import * as Electron from "electron";

import * as Client from "thinktool-client";

// Get rid of warning about the default value of allowRenderProcessReuse being
// deprecated. We don't care about its value.
Electron.app.allowRendererProcessReuse = true;

Electron.app.whenReady().then(() => {
  const window = new Electron.BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
    },
  });

  const file = Electron.dialog.showSaveDialogSync(window, {
    title: "Open or Create File",
    buttonLabel: "Open",
  });

  if (file === undefined) {
    (global as any).storage = Client.Storage.ignore();
  } else {
    (global as any).storage = Client.Storage.ignore();
  }

  // [TODO] We need to do build/whatever only when using electron-builder for
  // some reason. Idk, maybe we should just add a hack to detect when we're
  // being run inside builder, and then use this then?
  window.loadFile("build/index.html");
});
