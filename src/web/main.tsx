import * as Client from "thinktool-client";

import * as Configuration from "../../conf/client.json";
import * as DemoData from "./demo-data.json";
import {Communication} from "../shared/dist";

(window as any).thinktoolApp = () => Client.thinktoolApp({apiHost: Configuration.apiHost});
(window as any).thinktoolDemo = () =>
  Client.thinktoolDemo({
    apiHost: Configuration.apiHost,
    data: DemoData as Communication.FullStateResponse,
  });
(window as any).thinktoolUser = () => Client.thinktoolUser({apiHost: Configuration.apiHost});
