import {Things} from "./data";
import * as data from "./data";
import {Update, initialize as initializeEvents} from "./events";
import * as server from "./server-api";

interface Component {
  element: Element;
  start(): void;   // Subscribe to events
  stop(): void;    // Unsubscribe from events
}

let state: Things = {};

const events = initializeEvents((update: Update) => {
  if (update.topic === "content-changed") {
    data.setContent(state, update.thing, update.newContent);
    server.putData(state);
  } else {
    throw `Invalid update: ${update}`;
  }
});

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
    element.size = element.value.length || 1;   // Basic auto-scaling; not perfect with variable pitch font
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

  const bullet = document.createElement("span");
  bullet.className = "bullet collapsed";
  element.appendChild(bullet);

  const component = content(thing);
  element.appendChild(component.element);

  let subtree_: Component = null;

  function expand(): void {
    subtree_ = subtree(thing);
    element.appendChild(subtree_.element);
    subtree_.start();
    bullet.classList.remove("collapsed");
    bullet.classList.add("expanded");
  }

  if (data.children(state, thing).length === 0) expand(); // Items with no children are always expanded

  bullet.onclick = () => {
    if (subtree_ === null) {
      expand();
    } else {
      if (data.children(state, thing).length === 0) {
        // Can't collapse tree with no children
        return;
      }

      subtree_.stop();
      element.removeChild(subtree_.element);
      subtree_ = null;
      bullet.classList.remove("expanded");
      bullet.classList.add("collapsed");
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

(window as any).debugSubscriptions = () => { events.debug() }; // eslint-disable-line @typescript-eslint/no-explicit-any

install();
