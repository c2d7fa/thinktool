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

let simulatingDisconnected = false;

(window as any).simulateDisconnected = () => {
  simulatingDisconnected = true;
};

(window as any).simulateReconnected = () => {
  simulatingDisconnected = false;
};

const server = (() => {
  let things = DemoData.things;

  let subscribers: [string, (changes: string[]) => void][] = [];

  return {
    fetchData() {
      return {things};
    },

    updateThings(
      clientId: string,
      updates: {name: string; content: Client.Communication.Content; children: {name: string; child: string}[]}[],
    ) {
      for (const update of updates) things = [update, ...things];

      for (const [clientId_, callback] of subscribers)
        if (clientId_ !== clientId) callback(updates.map((t) => t.name));
    },

    setContent(clientId: string, thing: string, content: Client.Communication.Content) {
      things = [{...things.find((t) => t.name === thing)!, content}, ...things];

      for (const [clientId_, callback] of subscribers) if (clientId_ !== clientId) callback([thing]);
    },

    subscribe(clientId: string, callback: (changes: string[]) => void) {
      subscribers.push([clientId, callback]);
    },
  };
})();

function fakeServer(clientId: string): Client.Server {
  let handleErrorCallbacks: ((error: Client.ServerError) => void)[] = [];
  let onChangesCallbacks: ((changes: string[]) => void)[] = [];

  function withSimulatingDisconnected<T>(f: () => T): T {
    if (simulatingDisconnected) {
      for (const callback of handleErrorCallbacks) {
        callback({error: "disconnected"});
      }
      throw "disconnected";
    } else {
      return f();
    }
  }

  server.subscribe(clientId, (change) => {
    onChangesCallbacks.forEach((callback) => callback(change));
  });

  return {
    async getFullState() {
      return withSimulatingDisconnected(() => server.fetchData());
    },

    async setContent(thing: string, content: Client.Communication.Content) {
      return withSimulatingDisconnected(() => server.setContent(clientId, thing, content));
    },

    async deleteThing(thing: string) {
      return withSimulatingDisconnected(() => {
        console.log("deleteThing", thing);
      });
    },

    async updateThings(
      things: {name: string; content: Client.Communication.Content; children: {name: string; child: string}[]}[],
    ) {
      return withSimulatingDisconnected(() => server.updateThings(clientId, things));
    },

    async getTutorialFinished() {
      return withSimulatingDisconnected(() => true);
    },

    async setTutorialFinished() {
      return withSimulatingDisconnected(() => console.log("setTutorialFinished"));
    },

    async onError(handleError_: (error: Client.ServerError) => void) {
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
      return withSimulatingDisconnected(() => {
        const result = server.fetchData().things.find((t) => t.name === thing);
        if (!result) return null;
        return {
          isPage: false,
          children: result.children,
          content: result.content,
        };
      });
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

ReactDOM.render(<Client.App remote={fakeServer("1")} />, iframe1.contentDocument?.getElementById("app")!);
ReactDOM.render(<Client.App remote={fakeServer("2")} />, iframe2.contentDocument?.getElementById("app")!);

for (const el of document.querySelectorAll("style")) {
  iframe1.contentDocument?.head.appendChild(el.cloneNode(true));
  iframe2.contentDocument?.head.appendChild(el.cloneNode(true));
}
