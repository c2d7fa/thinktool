import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Client from "./src/main";
import * as DemoData from "../web/lib/demo-data.json";

const appElement = document.createElement("div");
appElement.id = "app";
document.body.appendChild(appElement);

function fakeServer(): Client.RemoteServer {
  let simulatingDisconnected = false;

  (window as any).simulateDisconnected = () => {
    simulatingDisconnected = true;
  };

  (window as any).simulateReconnected = () => {
    simulatingDisconnected = false;
  };

  let handleError: (error: Client.RemoteServerError) => void = () => {};
  let onChangesCallback: (changes: string[]) => void = () => {};

  return {
    async getFullState() {
      if (simulatingDisconnected) {
        handleError({error: "disconnected"});
        throw "unable to get response from server";
      }

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
      if (simulatingDisconnected) handleError({error: "disconnected"});

      console.log("updateThings", things);
    },

    async getTutorialFinished() {
      return true;
    },

    async setTutorialFinished() {
      console.log("setTutorialFinished");
    },

    async onError(handleError_: (error: Client.RemoteServerError) => void) {
      handleError = handleError_;
    },

    async getUsername() {
      return "user";
    },

    onChanges(callback: (changes: string[]) => void) {
      onChangesCallback = callback;
      return () => {};
    },

    async getThingData(thing: string) {
      return null;
    },

    async deleteAccount(account: string) {
      console.log("deleteAccount", account);
    },

    async getEmail() {
      return "user@example.com";
    },

    async setEmail(email: string) {
      console.log("setEmail", email);
    },

    async setPassword(password: string) {
      console.log("setPassword", password);
    },

    async setToolbarState({shown}: {shown: boolean}) {
      console.log("setToolbarState", shown);
    },

    async getToolbarState() {
      return {shown: true};
    },

    logOutUrl: "/logout",
  };
}

ReactDOM.render(<Client.App remote={fakeServer()} />, document.getElementById("app"));
