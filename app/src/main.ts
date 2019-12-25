async function getData(): Promise<object> {
  return (await fetch("/data.json")).json();
}

async function putData(data: object): Promise<void> {
  await fetch("/data.json", {method: "put", body: JSON.stringify(data)});
}

function install(): void {
  const app = document.querySelector("#app");

  const data = document.createElement("textarea");
  data.id = "data";
  app.appendChild(data);

  const div = document.createElement("div");
  app.appendChild(div);

  const get_ = document.createElement("button");
  get_.id = "get";
  get_.textContent = "Get";
  get_.onclick = async () => { data.value = JSON.stringify(await getData()) };
  div.appendChild(get_);

  const put = document.createElement("button");
  put.id = "put";
  put.textContent = "Put";
  put.onclick = () => {
    try {
      putData(JSON.parse(data.value));
    } catch (_) {
      console.warn("Invalid JSON: %s", data.value);
    }
  };
  div.appendChild(put);
}

install();
