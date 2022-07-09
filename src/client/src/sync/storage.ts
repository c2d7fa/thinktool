import {Communication} from "@thinktool/shared";
import {Changes} from "./index";
import {Content} from "../data";
import {FullStateResponse} from "@thinktool/shared/dist/communication";
import {Storage} from "../remote-types";

// Don't store anything
export function ignore(data?: FullStateResponse): Storage {
  return {
    getFullState: async () => data ?? {things: []},
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
