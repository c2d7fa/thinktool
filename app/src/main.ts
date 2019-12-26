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

const events: Events & {debug(): void} = (() => {
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
      delete listeners[topic][subscription];
  }

  function update(payload: Update): void {
    handle(payload);
    if (listeners[payload.topic])
      for (const k in listeners[payload.topic])
        listeners[payload.topic][k]();
  }

  function debug(): void {
    console.group("Subscriptions");
    for (const topic in listeners) {
      let size = 0;
      for (const _ in listeners[topic]) size++;
      console.log("%o in %s", size, topic);
    }
    console.groupEnd();
  }

  return {subscribe, unsubscribe, update, debug};
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
  let subtree_: Component = null;

  const button = document.createElement("button");
  button.textContent = "toggle";
  element.appendChild(button);
  button.onclick = () => {
    if (subtree_ === null) {
      subtree_ = subtree(thing);
      element.appendChild(subtree_.element);
      subtree_.start();
    } else {
      subtree_.stop();
      element.removeChild(subtree_.element);
      subtree_ = null;
    }
  };

  function start(): void {
    component.start();
  }

  function stop(): void {
    component.stop();
    if (subtree_ !== null)
      subtree_.stop();
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

  const outline_ = outline(5);
  app.appendChild(outline_.element);
  outline_.start();
}

(window as any).debugSubscriptions = () => { events.debug() };

install();
