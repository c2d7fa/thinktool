import {Communication} from "@thinktool/shared";
import * as API from "./server-api";
import {Effects} from "./diff";
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

export function server(server: API.Server): Storage {
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

export function execute(
  storage: Storage,
  effects: Effects,
  args: {setContent(thing: string, content: Communication.Content): void},
) {
  for (const deleted of effects.deleted) {
    storage.deleteThing(deleted);
  }
  if (effects.updated.length > 0) {
    storage.updateThings(effects.updated);
  }
  for (const edited of effects.edited) {
    args.setContent(edited.thing, edited.content);
  }
  if (effects.tutorialFinished) {
    storage.setTutorialFinished();
  }
}
