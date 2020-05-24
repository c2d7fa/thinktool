import * as API from "./server-api";
import * as D from "./data";

export interface Storage {
  getFullState(): Promise<D.State>;

  setContent(thing: string, content: string): Promise<void>;
  deleteThing(thing: string): Promise<void>;
  updateThings(
    things: {name: string; content: string; children: {name: string; child: string; tag?: string}[]}[],
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
    getFullState: async () => D.empty,
    async setContent(thing: string, content: string) {},
    async deleteThing(thing: string) {},
    async updateThings(things: any) {},
    getTutorialFinished: async () => false,
    async setTutorialFinished() {},
  };
}
