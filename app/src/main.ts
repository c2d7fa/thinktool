import {Things} from "./data";
import * as data from "./data";
import * as server from "./server-api";

interface Component {
  element: Element;
  start(): void;   // Subscribe to events
  stop(): void;    // Unsubscribe from events
}

type Update =
  {topic: "none"} |
  {topic: "content-changed"; thing: number; newContent: string};

interface Events {
  subscribe(topic: "none" | "content-changed", notify: () => void): number;
  unsubscribe(subscription: number): void;
  update(payload: Update): void;
}

const events: Events = (() => {
  let i = 0;

  const listeners: {[k: string]: {[s: number]: () => void}} = {};

  function subscribe(topic: string, notify: () => void): number {
    const j = i++;

    console.log("subscribe(%o, %o) -> ", topic, notify, j);

    if (!listeners[topic])
      listeners[topic] = [];
    listeners[topic][j] = notify;

    return j;
  }

  function unsubscribe(subscription: number): void {
    console.log("unsubscribe(%o)", subscription);

    for (const topic in listeners)
      listeners[topic][subscription] = () => { return };  // TODO
  }

  function update(payload: Update): void {
    console.log("update(%o)", payload);
    if (listeners[payload.topic])
      for (const k in listeners[payload.topic])
        listeners[payload.topic][k]();
  }

  return {subscribe, unsubscribe, update};
})();

(window as any).events = events;

/*
const testData: data.Things = {
  5: {content: "Five", children: [1, 2, 4]},
  1: {content: "One", children: [2]},
  2: {content: "Two", children: [4]},
  4: {content: "Four", children: []},
};
*/

function content(things: Things, thing: number): Component {
  const element = document.createElement("span");
  element.className = "content";

  let subscription: number = null;

  function update(): void {
    element.textContent = data.content(things, thing);
  }

  function start(): void {
    stop();
    subscription = events.subscribe("content-changed", () => { console.log("content(..., %o) received update", thing) });
    update();
  }

  function stop(): void {
    if (subscription !== null)
      events.unsubscribe(subscription);
    subscription = null;
  }

  return {element, start, stop};
}

function outline(things: Things, thing: number): Component {
  const subcomponents: Component[] = [];

  function registeredItem(things: Things, thing: number): Element {
    const li = document.createElement("li");
    li.className = "outline-item";

    const component = content(things, thing);
    subcomponents.push(component);
    li.appendChild(component.element);

    const children = data.children(things, thing);
    if (children.length !== 0) {
      const ul = document.createElement("ul");
      ul.className = "outline-tree";
      for (const child of data.children(things, thing)) {
        ul.appendChild(registeredItem(things, child));
      }
      li.appendChild(ul);
    }

    return li;
  }

  const element = document.createElement("ul");
  element.className = "outline-tree outline-root-tree";
  const li = registeredItem(things, thing);
  li.className = `${li.className} outline-root-item`;
  element.appendChild(li);

  function start(): void {
    for (const subcomponent of subcomponents)
      subcomponent.start();
  }

  function stop(): void {
    for (const subcomponent of subcomponents)
      subcomponent.stop();
  }

  return {element, start, stop};
}

async function install(): Promise<void> {
  const app = document.querySelector("#app");
  const things = await server.getData() as Things;

  const outline_ = outline(things, 5);
  (window as any).outline = outline_;
  app.appendChild(outline_.element);
  outline_.start();

  console.log(things);
}

install();
