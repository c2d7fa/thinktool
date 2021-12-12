import * as Electron from "electron";

Electron.app.whenReady().then(async () => {
  const window = new Electron.BrowserWindow({
    webPreferences: {
      nodeIntegration: true,

      // [TODO] We should make our application compatible with the default value
      // instead. See https://www.electronjs.org/docs/tutorial/context-isolation.
      contextIsolation: false,
    },
  });

  window.setMenu(null);

  Electron.ipcMain.handle("open-file", async () => {
    return (
      await Electron.dialog.showSaveDialog(window, {
        title: "Open or Create File",
        buttonLabel: "Open",
      })
    ).filePath;
  });

  // [TODO] We need to do build/whatever only when using electron-builder for
  // some reason. Idk, maybe we should just add a hack to detect when we're
  // being run inside builder, and then use this then?
  window.loadFile("build/index.html");
});
