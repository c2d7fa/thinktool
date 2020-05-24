import * as Electron from "electron";

import * as Client from "thinktool-client";

const storage = Electron.remote.getGlobal("storage") as Client.Storage.Storage;
Client.startLocalApp({storage});
