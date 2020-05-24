import * as D from "./data";
import {Communication} from "thinktool-shared";

export type Server = ReturnType<typeof initialize>;

export function transformFullStateResponseIntoState(response: Communication.FullStateResponse): D.State {
  let state: D.State = {things: {}, connections: {}};

  for (const thing of response.things) {
    if (!D.exists(state, thing.name)) {
      const [newState, _] = D.create(state, thing.name);
      state = newState;
    }
    state = D.setContent(state, thing.name, thing.content);
    for (const childConnection of thing.children) {
      state = D.addChild(state, thing.name, childConnection.child, childConnection.name)[0];
      if (childConnection.tag !== undefined)
        state = D.setTag(state, {connectionId: childConnection.name}, childConnection.tag);
    }
  }

  return state;
}

export function initialize(apiHost: string) {
  async function api(endpoint: string, args?: object) {
    return fetch(`${apiHost}/${endpoint}`, {credentials: "include", ...args});
  }

  // The server expects us to identify ourselves. This way, the server will not
  // notify us of any changes that we are ourselves responsible for.
  const clientId = Math.floor(Math.random() * Math.pow(36, 6)).toString(36);

  async function getFullState(): Promise<D.State> {
    const response = (await (await api("state")).json()) as Communication.FullStateResponse;

    if (response.things.length === 0) {
      return D.empty;
    }

    return transformFullStateResponseIntoState(response);
  }

  async function getUsername(): Promise<string | null> {
    const response = await api("username");
    if (response.status === 401) return null;
    return await response.json();
  }

  async function setContent(thing: string, content: string): Promise<void> {
    await api(`api/things/${thing}/content`, {
      method: "put",
      body: content,
      headers: {"Thinktool-Client-Id": clientId},
    });
  }

  async function deleteThing(thing: string): Promise<void> {
    await api(`state/things/${thing}`, {method: "delete", headers: {"Thinktool-Client-Id": clientId}});
  }

  async function updateThings(
    things: {name: string; content: string; children: {name: string; child: string; tag?: string}[]}[],
  ): Promise<void> {
    await api(`state/things`, {
      method: "post",
      headers: {"Content-Type": "application/json", "Thinktool-Client-Id": clientId},
      body: JSON.stringify(things as Communication.UpdateThings),
    });
  }

  function onChanges(callback: (changes: string[]) => void): () => void {
    const apiHostUrl = new URL(apiHost);
    const url = `${apiHostUrl.protocol === "https:" ? "wss" : "ws"}://${apiHostUrl.host}/changes`;

    const socket = new WebSocket(url);
    socket.onopen = () => {
      socket.send(clientId);
    };
    socket.onmessage = (msg) => {
      const data = msg.data;
      const changes = JSON.parse(data);
      if (!(changes instanceof Array)) throw "bad data from server";
      callback(changes);
    };

    return () => socket.close();
  }

  async function getThingData(thing: string): Promise<Communication.ThingData | null> {
    const response = await api(`state/things/${thing}`);
    if (response.status === 404) return null;
    return (await response.json()) as Communication.ThingData;
  }

  const logOutUrl = `${apiHost}/logout`;

  function ping(note: string): void {
    fetch(`${apiHost}/ping/${note}`, {mode: "no-cors"});
  }

  async function deleteAccount(account: string): Promise<void> {
    // We require the account name here to make it harder to accidentally send a
    // request to delete the user's entire account.
    api(`api/account/everything/${account}`, {method: "DELETE"});
  }

  async function getEmail(): Promise<string> {
    return (await api(`api/account/email`, {method: "GET"})).text();
  }

  async function setEmail(email: string): Promise<void> {
    await api(`api/account/email`, {method: "PUT", body: email});
  }

  async function setPassword(password: string): Promise<void> {
    await api(`api/account/password`, {method: "PUT", body: password});
  }

  async function getTutorialFinished(): Promise<boolean> {
    return (await api(`api/account/tutorial-finished`)).json();
  }

  async function setTutorialFinished(): Promise<void> {
    await api(`api/account/tutorial-finished`, {method: "PUT", body: "true"});
  }

  return {
    transformFullStateResponseIntoState,
    getFullState,
    getUsername,
    setContent,
    deleteThing,
    updateThings,
    onChanges,
    getThingData,
    logOutUrl,
    ping,
    deleteAccount,
    getEmail,
    setEmail,
    setPassword,
    getTutorialFinished,
    setTutorialFinished,
  };
}
