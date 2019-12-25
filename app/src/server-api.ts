export async function getData(): Promise<object> {
  return (await fetch("/data.json")).json();
}

export async function putData(data: object): Promise<void> {
  await fetch("/data.json", {method: "put", body: JSON.stringify(data)});
}
