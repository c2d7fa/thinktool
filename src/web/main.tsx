import * as Client from "thinktool-client";

import * as Configuration from "../../conf/client.json";

(window as any).thinktoolApp = () => Client.thinktoolApp({apiHost: Configuration.apiHost});
(window as any).thinktoolDemo = () => Client.thinktoolDemo({apiHost: Configuration.apiHost});
(window as any).thinktoolUser = () => Client.thinktoolUser({apiHost: Configuration.apiHost});
