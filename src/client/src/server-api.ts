import * as D from "./data";
import {Communication} from "@thinktool/shared";

export type Server = ReturnType<typeof initialize>;

export function transformFullStateResponseIntoState(response: Communication.FullStateResponse): D.State {
  // [NOTE] The performance of this function matters. For that reason, we bypass
  // the Data module's interface, and just construct the objects directly. This
  // is really not ideal. We should look into libraries like Immutable.js, and
  // try to make the Data library faster in general. Alternatively, we should
  // put something like this function in Data.
  //
  // See the commit history of this function (spcifically the commit where this
  // comment was added) for a version that used the Data module interface
  // properly.

  if (response.things.length === 0) return D.empty;

  let state: D.State = D.empty;

  for (const thing of response.things) {
    if (!D.exists(state, thing.name)) {
      state.things[thing.name] = {children: [], content: [], parents: [], isPage: false};
    }
    state.things[thing.name]!.content = thing.content;
    for (const connection of thing.children) {
      state.connections[connection.name] = {parent: thing.name, child: connection.child};
      if (state.things[connection.child] === undefined) {
        state.things[connection.child] = {children: [], content: [], parents: [], isPage: false};
      }
      state.things[connection.child]!.parents.push({connectionId: connection.name});
      state.things[thing.name]!.children.push({connectionId: connection.name});
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

  async function getFullState(): Promise<Communication.FullStateResponse> {
    return (await (await api("state")).json()) as Communication.FullStateResponse;
  }

  async function getUsername(): Promise<string | null> {
    const response = await api("username");
    if (response.status === 401) return null;
    return await response.json();
  }

  async function setContent(thing: string, content: Communication.Content): Promise<void> {
    await api(`api/things/${thing}/content`, {
      method: "put",
      body: JSON.stringify(content),
      headers: {"Content-Type": "application/json", "Thinktool-Client-Id": clientId},
    });
  }

  async function deleteThing(thing: string): Promise<void> {
    await api(`state/things/${thing}`, {method: "delete", headers: {"Thinktool-Client-Id": clientId}});
  }

  async function updateThings(
    things: {
      name: string;
      content: Communication.Content;
      children: {name: string; child: string}[];
      isPage: boolean;
    }[],
  ): Promise<void> {
    const message: Communication.UpdateThings = things;
    await api(`state/things`, {
      method: "post",
      headers: {"Content-Type": "application/json", "Thinktool-Client-Id": clientId},
      body: JSON.stringify(message),
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
    deleteAccount,
    getEmail,
    setEmail,
    setPassword,
    getTutorialFinished,
    setTutorialFinished,
  };
}
