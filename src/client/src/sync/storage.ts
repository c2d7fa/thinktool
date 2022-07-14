import {Communication} from "@thinktool/shared";
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
