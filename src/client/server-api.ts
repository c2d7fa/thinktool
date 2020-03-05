import * as D from "./data";
import * as Communication from "../shared/communication";

// The server expects us to identify ourselves. This way, the server will not
// notify us of any changes that we are ourselves responsible for.
const clientId = Math.floor(Math.random() * Math.pow(36, 6)).toString(36);

export async function getFullState(): Promise<D.Things> {
  const response = await (await fetch("/api/things")).json() as Communication.FullStateResponse;

  const things = {};
  for (const thing of response) {
    things[thing.name] = {content: thing.content, children: thing.children};
  }

  return {things};
}

export async function getUsername(): Promise<string> {
  return (await fetch("/api/username")).json();
}

export async function setContent(thing: string, content: string): Promise<void> {
  await fetch(`/api/things/${thing}/content`, {method: "put", body: content, headers: {"Thinktool-Client-Id": clientId}});
}

export async function deleteThing(thing: string): Promise<void> {
  await fetch(`/api/things/${thing}`, {method: "delete", headers: {"Thinktool-Client-Id": clientId}});
}

export async function putThing(thing: string, data: D.ThingData): Promise<void> {
  const request: Communication.ThingData = data;
  await fetch(`/api/things/${thing}`, {method: "put", headers: {"Content-Type": "application/json", "Thinktool-Client-Id": clientId}, body: JSON.stringify(request)});
}

export function onChanges(callback: (changes: string[]) => void): () => void {
  // TODO: This is a bit awkward. We do this so it works both on localhost:8080
  // and on a "real" domain.
  const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/changes`;

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
  const response = await fetch(`/api/things/${thing}`);
  if (response.status === 404) return null;
  return await response.json() as Communication.ThingData;
}
