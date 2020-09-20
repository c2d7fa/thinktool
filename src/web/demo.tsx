import "core-js/stable";

import * as Client from "@thinktool/client";

import * as Configuration from "../../conf/client.json";
import * as DemoData from "./demo-data.json";
import {Communication} from "@thinktool/shared";

Client.thinktoolDemo({
  apiHost: Configuration.apiHost,
  data: DemoData as Communication.FullStateResponse,
});
