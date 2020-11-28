export type Subscription = {unsubscribe(): void};

export type Receiver<M> = {
  send<K extends keyof M>(tag: K, event: M[K]): void;
  subscribe<K extends keyof M>(tag: K, callback: (event: M[K]) => void): Subscription;
};

export function receiver<M>() {
  const callbacks: Map<keyof M, ((event: any) => void)[]> = new Map();

  function subscribe<K extends keyof M>(tag: K, callback: (event: M[K]) => void) {
    if (!callbacks.has(tag)) callbacks.set(tag, []);
    callbacks.get(tag)!.push(callback);

    // [TODO]
    return {
      unsubscribe() {
        console.error("Unimplemented!");
      },
    };
  }

  function send<K extends keyof M>(tag: K, event: M[K]) {
    if (!callbacks.has(tag)) return;
    for (const callback of callbacks.get(tag)!) callback(event);
  }

  return {subscribe, send};
}
