import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Client from "./src/main";
import * as DemoData from "../web/lib/demo-data.json";

const appElement = document.createElement("div");
appElement.id = "app";
document.body.appendChild(appElement);

ReactDOM.render(<Client.Demo data={DemoData} />, document.getElementById("app"));
