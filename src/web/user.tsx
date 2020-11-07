import * as React from "react";
import * as ReactDOM from "react-dom";
import "core-js/stable";
import * as Thinktool from "@thinktool/client";

// Provided by Parcel
declare let process: {env: {[k: string]: string | undefined}};

ReactDOM.render(<Thinktool.User apiHost={process.env.DIAFORM_API_HOST!} />, document.getElementById("user"));
