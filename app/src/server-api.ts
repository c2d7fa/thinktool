export async function getData(): Promise<object> {
  return (await fetch("/data.json")).json();
}

export async function putData(data: object): Promise<void> {
  await fetch("/data.json", {method: "put", body: JSON.stringify(data)});
}

export async function getUsername(): Promise<string> {
  return (await fetch("/api/username")).json();
}
