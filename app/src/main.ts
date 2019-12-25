import {Things} from "./data";
import * as data from "./data";
import * as server from "./server-api";

const testData: data.Things = {
  5: {content: "Five", children: [1, 2, 4]},
  1: {content: "One", children: [2]},
  2: {content: "Two", children: [4]},
  4: {content: "Four", children: []},
};

function renderContent(things: Things, thing: number): Element {
  const span = document.createElement("span");
  span.className = "content";
  span.textContent = data.content(things, thing);
  return span;
}

function renderOutline(things: Things, thing: number): Element {
  function renderItem(things: Things, thing: number): Element {
    const li = document.createElement("li");
    li.className = "outline-item";
    li.appendChild(renderContent(things, thing));

    const children = data.children(things, thing);
    if (children.length !== 0) {
      const ul = document.createElement("ul");
      ul.className = "outline-tree";
      for (const child of data.children(things, thing)) {
        ul.appendChild(renderItem(things, child));
      }
      li.appendChild(ul);
    }

    return li;
  }

  const ul = document.createElement("ul");
  ul.className = "outline-tree outline-root-tree";
  const li = renderItem(things, thing);
  li.className = `${li.className} outline-root-item`;
  ul.appendChild(li);

  return ul;
}

async function install(): Promise<void> {
  await server.putData(testData);

  const app = document.querySelector("#app");
  const things = await server.getData() as Things;

  app.appendChild(renderOutline(things, 5));

  console.log(things);
}

install();
