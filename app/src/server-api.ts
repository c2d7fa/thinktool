export async function getData(): Promise<object> {
  return (await fetch("/api/things")).json();
}

export async function putData(data: object): Promise<void> {
  await fetch("/api/things", {method: "put", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)});
}

export async function getUsername(): Promise<string> {
  return (await fetch("/api/username")).json();
}

export async function setContent(thing: number, content: string): Promise<void> {
  await fetch(`/api/things/${thing}/content`, {method: "put", body: content});
}

export async function setPage(thing: number, page: string): Promise<void> {
  await fetch(`/api/things/${thing}/page`, {method: "put", body: page});
}

export async function removePage(thing: number): Promise<void> {
  await fetch(`/api/things/${thing}/page`, {method: "delete"});
}
