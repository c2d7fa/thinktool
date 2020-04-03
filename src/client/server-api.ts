import * as D from "./data";
import * as Communication from "../shared/communication";

import * as Configuration from "../../conf/client.json";

const apiHost = Configuration.apiHost;

function api(endpoint: string, args?: object) {
  return fetch(`${apiHost}/${endpoint}`, {credentials: "include", ...args});
}

// The server expects us to identify ourselves. This way, the server will not
// notify us of any changes that we are ourselves responsible for.
const clientId = Math.floor(Math.random() * Math.pow(36, 6)).toString(36);

export async function getFullState(): Promise<D.State> {
  const response = (await (await api("state")).json()) as Communication.FullStateResponse;

  if (response.things.length === 0) {
    return D.empty;
  }

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

export async function getUsername(): Promise<string> {
  return (await api("username")).json();
}

export async function setContent(thing: string, content: string): Promise<void> {
  await api(`api/things/${thing}/content`, {
    method: "put",
    body: content,
    headers: {"Thinktool-Client-Id": clientId},
  });
}

export async function deleteThing(thing: string): Promise<void> {
  await api(`state/things/${thing}`, {method: "delete", headers: {"Thinktool-Client-Id": clientId}});
}

export async function updateThing(
  thing: string,
  data: {content: string; children: {name: string; child: string; tag?: string}[]},
): Promise<void> {
  await api(`state/things/${thing}`, {
    method: "put",
    headers: {"Content-Type": "application/json", "Thinktool-Client-Id": clientId},
    body: JSON.stringify(data as Communication.ThingData),
  });
}

export function onChanges(callback: (changes: string[]) => void): () => void {
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

export async function getThingData(thing: string): Promise<Communication.ThingData | null> {
  const response = await api(`api/things/${thing}`);
  if (response.status === 404) return null;
  return (await response.json()) as Communication.ThingData;
}

export const logOutUrl = `${apiHost}/logout`;

export function ping(note: string): void {
  fetch(`${apiHost}/ping/${note}`, {mode: "no-cors"});
}

export async function deleteAccount(account: string): Promise<void> {
  api(`api/account/${account}`, {method: "DELETE"});
}
