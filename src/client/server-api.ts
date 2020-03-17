import * as D from "./data";
import * as Communication from "../shared/communication";

import * as Configuration from "../../conf/client.json";

const apiHost = Configuration.apiHost

function api(endpoint: string, args?: object) {
  return fetch(`${apiHost}/api/${endpoint}`, {credentials: "include", ...args})
}

// The server expects us to identify ourselves. This way, the server will not
// notify us of any changes that we are ourselves responsible for.
const clientId = Math.floor(Math.random() * Math.pow(36, 6)).toString(36);

export async function getFullState(): Promise<D.State> {
  const response = await (await api("things")).json() as Communication.FullStateResponse;

  let state = {things: {}};
  for (const thing of response) {
    if (!D.exists(state, thing.name)) {
      const [newState, _] = D.create(state, thing.name);
      state = newState;
    }
    state = D.setContent(state, thing.name, thing.content);
    for (const child of thing.children) {
      if (!D.exists(state, child)) {
        const [newState, _] = D.create(state, child);
        state = newState;
      }
      state = D.addChild(state, thing.name, child)
    }
  }

  return state;
}

export async function getUsername(): Promise<string> {
  return (await api("username")).json();
}

export async function setContent(thing: string, content: string): Promise<void> {
  await api(`things/${thing}/content`, {method: "put", body: content, headers: {"Thinktool-Client-Id": clientId}});
}

export async function deleteThing(thing: string): Promise<void> {
  await api(`things/${thing}`, {method: "delete", headers: {"Thinktool-Client-Id": clientId}});
}

export async function putThing(thing: string, data: Communication.ThingData): Promise<void> {
  await api(`things/${thing}`, {method: "put", headers: {"Content-Type": "application/json", "Thinktool-Client-Id": clientId}, body: JSON.stringify(data)});
}

export function onChanges(callback: (changes: string[]) => void): () => void {
  // TODO: This is a bit awkward. We do this so it works both on localhost:8080
  // and on a "real" domain.
  const apiHostUrl = new URL(apiHost)
  const url = `${apiHostUrl.protocol === "https:" ? "wss" : "ws"}://${apiHostUrl.host}/api/changes`;

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
  const response = await api(`things/${thing}`);
  if (response.status === 404) return null;
  return await response.json() as Communication.ThingData;
}

export const logOutUrl = `${apiHost}/logout`
