import {LocationInTree} from "./data";

export type Update =
  {topic: "none"} |
  {topic: "content-changed"; thing: number; newContent: string} |
  {topic: "move"; direction: "up" | "down"; item: LocationInTree} |
  {topic: "move"; direction: "up" | "down"; item: LocationInTree};

interface Events {
  subscribe(topic: "none" | "content-changed" | "move", notify: (payload: Update) => void): number;
  unsubscribe(subscription: number): void;
  update(payload: Update): void;
}

export function initialize(handle: (payload: Update) => void): Events & {debug(): void} {
  let i = 0;

  const listeners: {[k: string]: {[s: number]: (payload: Update) => void}} = {};

  function subscribe(topic: string, notify: (payload: Update) => void): number {
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
        listeners[payload.topic][k](payload);
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
}
