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

function expandableItem(thing: number): Component {
  const element = document.createElement("li");
  element.className = "outline-item";

  const component = content(thing);
  element.appendChild(component.element);

  // TODO: This is pretty rough. We need to make sure that our children are
  // cleaned up, and we also want to be able to collapse a subtree.
  const button = document.createElement("button");
  button.textContent = "expand";
  element.appendChild(button);
  button.onclick = () => {
    const subtree_ = subtree(thing);
    element.appendChild(subtree_.element);
    subtree_.start();
  };

  function start(): void {
    component.start();
  }

  function stop(): void {
    component.stop();
  }

  return {element, start, stop};
}

// Subtree, not including the parent itself.
function subtree(parent: number): Component {
  const children = data.children(state, parent);

  const subcomponents: Component[] = [];

  const element = document.createElement("ul");

  if (children.length !== 0) {
    element.className = "outline-tree";
    for (const child of children) {
      const item = expandableItem(child);
      subcomponents.push(item);
      element.appendChild(item.element);
    }
  }

  function start(): void {
    subcomponents.forEach(s => s.start());
  }

  function stop(): void {
    subcomponents.forEach(s => s.stop());
  }

  return {element, start, stop};
}

function outline(thing: number): Component {
  const element = document.createElement("ul");
  element.className = "outline-tree outline-root-tree";

  const root = expandableItem(thing);
  root.element.className = `${root.element.className} outline-root-item`;

  element.appendChild(root.element);

  function start(): void {
    root.start();
  }

  function stop(): void {
    root.stop();
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
