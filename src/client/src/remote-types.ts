import {Communication} from "@thinktool/shared";

export type ServerError = {error: "disconnected"} | {error: "error"; status: number};

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

export interface Server extends Storage {
  onError(handleError: (error: ServerError) => void): Promise<void>;
  getUsername(): Promise<string | null>;
  onChanges(callback: (changes: string[]) => void): () => void;
  getThingData(thing: string): Promise<Communication.ThingData | null>;
  deleteAccount(account: string): Promise<void>;
  getEmail(): Promise<string>;
  setEmail(email: string): Promise<void>;
  setPassword(password: string): Promise<void>;
  setToolbarState({shown}: {shown: boolean}): Promise<void>;
  getToolbarState(): Promise<{shown: boolean}>;
  logOutUrl: string;
}

export function isStorageServer(storage: Storage | Server): storage is Server {
  return (storage as any).onError !== undefined;
}
