import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Client from "./src/main";
import * as DemoData from "../web/lib/demo-data.json";

document.body.style.display = "grid";
document.body.style.gridTemplateColumns = "50vw 50vw";
document.body.style.height = "100vh";

const iframe1 = document.createElement("iframe");
iframe1.src = "about:blank";
iframe1.width = "100%";
iframe1.height = "100%";
document.body.appendChild(iframe1);

const iframe2 = document.createElement("iframe");
iframe2.src = "about:blank";
iframe2.width = "100%";
iframe2.height = "100%";
document.body.appendChild(iframe2);

const appElement1 = iframe1.contentDocument!.createElement("div")!;
appElement1.id = "app";
iframe1.contentDocument?.body.appendChild(appElement1);

const appElement2 = iframe2.contentDocument!.createElement("div")!;
appElement2.id = "app";
iframe2.contentDocument?.body.appendChild(appElement2);

const server = (() => {
  let simulatingDisconnected = false;

  (window as any).simulateDisconnected = () => {
    simulatingDisconnected = true;
  };

  (window as any).simulateReconnected = () => {
    simulatingDisconnected = false;
  };

  return {
    isDown() {
      return simulatingDisconnected;
    },
  };
})();

function fakeServer(): Client.RemoteServer {
  let handleErrorCallbacks: ((error: Client.RemoteServerError) => void)[] = [];
  let onChangesCallbacks: ((changes: string[]) => void)[] = [];

  function errorIfSimulatingDisconnected() {
    if (server.isDown()) {
      for (const callback of handleErrorCallbacks) {
        callback({error: "disconnected"});
      }
    }
  }

  return {
    async getFullState() {
      if (server.isDown()) {
        errorIfSimulatingDisconnected();
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
      errorIfSimulatingDisconnected();
      console.log("updateThings", things);
    },

    async getTutorialFinished() {
      return true;
    },

    async setTutorialFinished() {
      console.log("setTutorialFinished");
    },

    async onError(handleError_: (error: Client.RemoteServerError) => void) {
      handleErrorCallbacks.push(handleError_);
    },

    async getUsername() {
      return "user";
    },

    onChanges(callback: (changes: string[]) => void) {
      onChangesCallbacks.push(callback);
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

ReactDOM.render(<Client.App remote={fakeServer()} />, iframe1.contentDocument?.getElementById("app")!);
ReactDOM.render(<Client.App remote={fakeServer()} />, iframe2.contentDocument?.getElementById("app")!);

for (const el of document.querySelectorAll("style")) {
  iframe1.contentDocument?.head.appendChild(el.cloneNode(true));
  iframe2.contentDocument?.head.appendChild(el.cloneNode(true));
}
