import * as D from "./data";

export async function getData(): Promise<D.Things> {
  // TODO: Error handling when converting to Things.
  return (await fetch("/api/things")).json() as Promise<D.Things>;
}

export async function getUsername(): Promise<string> {
  return (await fetch("/api/username")).json();
}

export async function setContent(thing: string, content: string): Promise<void> {
  await fetch(`/api/things/${thing}/content`, {method: "put", body: content});
}

export async function setPage(thing: string, page: string): Promise<void> {
  await fetch(`/api/things/${thing}/page`, {method: "put", body: page});
}

export async function removePage(thing: string): Promise<void> {
  await fetch(`/api/things/${thing}/page`, {method: "delete"});
}

export async function deleteThing(thing: string): Promise<void> {
  await fetch(`/api/things/${thing}`, {method: "delete"});
}

export async function putThing(thing: string, data: D.ThingData): Promise<void> {
  await fetch(`/api/things/${thing}`, {method: "put", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)});
}

export async function hasChanges(): Promise<boolean> {
  return (await fetch("/api/changes")).json();
}

export async function polledChanges(): Promise<void> {
  await fetch("/api/changes", {method: "post"});
}
