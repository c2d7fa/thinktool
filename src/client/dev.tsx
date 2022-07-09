import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Client from "./src/main";
import * as DemoData from "../web/lib/demo-data.json";

const appElement = document.createElement("div");
appElement.id = "app";
document.body.appendChild(appElement);

const server = {
  async getFullState() {
    return DemoData;
  },

  async setContent(thing: string, content: Client.Communication.Content) {
    console.log("setContent", thing, content);
  },

  async deleteThing(thing: string) {
    console.log("deleteThing", thing);
  },

  async updateThings(
    things: {name: string; content: Client.Communication.Content; children: {name: string; child: string}[]}[],
  ) {
    console.log("updateThings", things);
  },

  async getTutorialFinished() {
    return true;
  },

  async setTutorialFinished() {
    console.log("setTutorialFinished");
  },
};

ReactDOM.render(<Client.App remote={server} />, document.getElementById("app"));
