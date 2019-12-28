import {Things, LocationInTree} from "./data";
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
  } else if (update.topic === "move") {
    if (update.direction === "up") data.moveUp(state, update.item);
    else if (update.direction === "down") data.moveDown(state, update.item);
    else throw `Invalid update: ${update}`;
  } else {
    throw `Invalid update: ${update}`;
  }

  server.putData(state);
});

function content(thing: number, location: LocationInTree): Component {
  const parent = location?.parent;
  let index = location?.index;

  const element = document.createElement("input");
  element.className = "content";

  element.oninput = () => {
    events.update({topic: "content-changed", thing, newContent: element.value});
  };

  let contentSubscription: number = null;
  let moveSubscription: number = null;

  function update(): void {
    // Update content
    if (element.value !== data.content(state, thing))
      element.value = data.content(state, thing);
    element.size = element.value.length || 1;   // Basic auto-scaling; not perfect with variable pitch font
  }

  function updateAction(): void {
    element.onkeydown = (ev) => {
      if (ev.altKey && ev.key === "ArrowUp") {
        events.update({topic: "move", direction: "up", item: {parent, index}});
      } else if (ev.altKey && ev.key === "ArrowDown") {
        events.update({topic: "move", direction: "down", item: {parent, index}});
      }
    };
  }

  function start(): void {
    stop();
    contentSubscription = events.subscribe("content-changed", update);
    moveSubscription = events.subscribe("move", (payload: Update) => {
      if (payload.topic === "move" && payload.item.parent === parent && payload.item.index === index) {
        // TODO: We are calculating the same thing here as we are doing in a
        // bunch of other places. Surely this can be done in a smarter way!
        if (payload.direction === "up") index--;
        else if (payload.direction === "down") index++;
        else throw null;
        updateAction();
      }
    });
    update();
    updateAction();
  }

  function stop(): void {
    if (contentSubscription !== null) events.unsubscribe(contentSubscription);
    contentSubscription = null;

    if (moveSubscription !== null) events.unsubscribe(moveSubscription);
    moveSubscription = null;
  }

  return {element, start, stop};
}

function expandableItem(thing: number, location: LocationInTree | null): Component {
  const element = document.createElement("li");
  element.className = "outline-item";

  const bullet = document.createElement("span");
  bullet.className = "bullet collapsed";
  element.appendChild(bullet);

  const component = content(thing, location);
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
  let moveSubscription: number = null;

  const element = document.createElement("ul");

  if (children.length !== 0) {
    element.className = "outline-tree";
    for (let i = 0; i < children.length; ++i) {
      const item = expandableItem(children[i], {parent, index: i});
      subcomponents.push(item);
      element.appendChild(item.element);
    }
  }

  function start(): void {
    subcomponents.forEach(s => s.start());

    moveSubscription = events.subscribe("move", (ev) => {
      if (ev.topic === "move" && ev.item.parent === parent) {
        const active = document.activeElement as HTMLElement;
        if (ev.direction === "up") {
          element.insertBefore(element.children[ev.item.index], element.children[ev.item.index - 1]);
        } else {
          element.insertBefore(element.children[ev.item.index], element.children[ev.item.index + 2]);
        }
        active.focus();
      }
    });
  }

  function stop(): void {
    subcomponents.forEach(s => s.stop());

    if (moveSubscription !== null) events.unsubscribe(moveSubscription);
    moveSubscription = null;
  }

  return {element, start, stop};
}

function outline(thing: number): Component {
  const element = document.createElement("ul");
  element.className = "outline-tree outline-root-tree";

  const root = expandableItem(thing, null);
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
