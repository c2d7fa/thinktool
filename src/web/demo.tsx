import "core-js/stable";

import * as Client from "@thinktool/client";

// Provided by Parcel
declare let process: {env: {[k: string]: string | undefined}};

import * as DemoData from "./demo-data.json";
import {Communication} from "@thinktool/shared";

Client.thinktoolDemo({
  apiHost: process.env.DIAFORM_API_HOST!,
  data: DemoData as Communication.FullStateResponse,
});
