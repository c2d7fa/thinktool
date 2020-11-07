import * as React from "react";
import * as ReactDOM from "react-dom";
import "core-js/stable";

import * as Thinktool from "@thinktool/client";
import * as DemoData from "./demo-data.json";

ReactDOM.render(<Thinktool.Demo data={DemoData} />, document.getElementById("root"));
