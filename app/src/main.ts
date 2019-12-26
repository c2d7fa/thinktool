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

let state: Things = {};

function handle(update: Update): void {
  if (update.topic === "content-changed") {
    data.setContent(state, update.thing, update.newContent);
    server.putData(state);
  } else {
    throw `Invalid update: ${update}`;
  }
}

const events: Events = (() => {
  let i = 0;

  const listeners: {[k: string]: {[s: number]: () => void}} = {};

  function subscribe(topic: string, notify: () => void): number {
    const j = i++;

    if (!listeners[topic])
      listeners[topic] = [];
    listeners[topic][j] = notify;

    return j;
  }

  function unsubscribe(subscription: number): void {
    for (const topic in listeners)
      listeners[topic][subscription] = () => { return };  // TODO
  }

  function update(payload: Update): void {
    handle(payload);
    if (listeners[payload.topic])
      for (const k in listeners[payload.topic])
        listeners[payload.topic][k]();
  }

  return {subscribe, unsubscribe, update};
})();

function content(thing: number): Component {
  const element = document.createElement("input");
  element.className = "content";

  element.oninput = () => {
    events.update({topic: "content-changed", thing, newContent: element.value});
  };

  let subscription: number = null;

  function update(): void {
    if (element.value !== data.content(state, thing))
      element.value = data.content(state, thing);
    element.size = element.value.length;   // Basic auto-scaling; not perfect with variable pitch font
  }

  function start(): void {
    stop();
    subscription = events.subscribe("content-changed", update);
    update();
  }

  function stop(): void {
    if (subscription !== null)
      events.unsubscribe(subscription);
    subscription = null;
  }

  return {element, start, stop};
}

function outline(thing: number): Component {
  const subcomponents: Component[] = [];

  function registeredItem(thing: number): Element {
    const li = document.createElement("li");
    li.className = "outline-item";

    const component = content(thing);
    subcomponents.push(component);
    li.appendChild(component.element);

    const children = data.children(state, thing);
    if (children.length !== 0) {
      const ul = document.createElement("ul");
      ul.className = "outline-tree";
      for (const child of data.children(state, thing)) {
        ul.appendChild(registeredItem(child));
      }
      li.appendChild(ul);
    }

    return li;
  }

  const element = document.createElement("ul");
  element.className = "outline-tree outline-root-tree";
  const li = registeredItem(thing);
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

  state = await server.getData() as Things;
  console.log(state);

  const outline_ = outline(5);
  app.appendChild(outline_.element);
  outline_.start();
}

install();
