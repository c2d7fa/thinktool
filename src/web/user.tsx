import "core-js/stable";

import * as Client from "@thinktool/client";

// Provided by Parcel
declare let process: {env: {[k: string]: string | undefined}};

Client.thinktoolUser({apiHost: process.env.DIAFORM_API_HOST!});
