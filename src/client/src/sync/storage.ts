import {Communication} from "@thinktool/shared";
import {ServerApi} from "./server-api";
import {Changes} from "./diff";
import {Content} from "../data";
export * as Diff from "./diff";

export interface Storage {
  getFullState(): Promise<Communication.FullStateResponse>;

  setContent(thing: string, content: Communication.Content): Promise<void>;
  deleteThing(thing: string): Promise<void>;
  updateThings(
    things: {name: string; content: Communication.Content; children: {name: string; child: string}[]}[],
  ): Promise<void>;

  getTutorialFinished(): Promise<boolean>;
  setTutorialFinished(): Promise<void>;
}

export function server(server: ServerApi): Storage {
  return {
    getFullState: server.getFullState.bind(server),
    setContent: server.setContent.bind(server),
    deleteThing: server.deleteThing.bind(server),
    updateThings: server.updateThings.bind(server),
    getTutorialFinished: server.getTutorialFinished.bind(server),
    setTutorialFinished: server.setTutorialFinished.bind(server),
  };
}

// Don't store anything
export function ignore(): Storage {
  return {
    getFullState: async () => ({things: []}),
    async setContent(thing: string, content: Communication.Content) {},
    async deleteThing(thing: string) {},
    async updateThings(things: any) {},
    getTutorialFinished: async () => false,
    async setTutorialFinished() {},
  };
}

class BatchedUpdates {
  private cooldown: {ms: number};
  private timeouts: Record<string, number> = {};
  private callbacks: Record<string, () => void> = {};

  constructor(cooldown: {ms: number}) {
    this.cooldown = cooldown;
  }

  update(key: string, callback: () => void): void {
    if (this.timeouts[key] !== undefined) {
      clearTimeout(this.timeouts[key]);
      delete this.timeouts[key];
    }
    this.callbacks[key] = callback;
    this.timeouts[key] = window.setTimeout(() => {
      callback();
      delete this.callbacks[key];
    }, this.cooldown.ms);
  }

  flushPending(): void {
    for (const key in this.callbacks) {
      this.callbacks[key]();
    }
  }
}

export class StorageExecutionContext {
  private batched: BatchedUpdates;
  private storage: Storage;

  constructor(storage: Storage, window: Window) {
    this.batched = new BatchedUpdates({ms: 200});
    this.storage = storage;

    window.addEventListener("beforeunload", () => {
      this.batched.flushPending();
    });
  }

  pushChanges(changes: Changes) {
    for (const deleted of changes.deleted) {
      this.storage.deleteThing(deleted);
    }
    if (changes.updated.length > 0) {
      this.storage.updateThings(changes.updated);
    }
    for (const edited of changes.edited) {
      this.pushContentUpdate(edited.thing, edited.content);
    }
    if (changes.tutorialFinished) {
      this.storage.setTutorialFinished();
    }
  }

  private pushContentUpdate(thing: string, content: Content) {
    this.batched.update(thing, () => this.storage.setContent(thing, content));
  }
}
