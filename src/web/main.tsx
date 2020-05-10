import "regenerator-runtime/runtime"; // [TODO] Why do we need this??

import * as Client from "thinktool-client";

import * as Configuration from "../../conf/client.json";

Client.initialize({apiHost: Configuration.apiHost});

(window as any).thinktoolApp = Client.thinktoolApp;
(window as any).thinktoolDemo = Client.thinktoolDemo;
(window as any).thinktoolUser = Client.thinktoolUser;
