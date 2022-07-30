import {Communication} from "@thinktool/shared";

export type ServerError = {error: "disconnected"} | {error: "error"; status: number};
export type ServerReturn = "ok" | ServerError;

export function isError<T>(x: T | ServerError): x is ServerError {
  return typeof x === "object" && "error" in x;
}

export interface Storage {
  getFullState(): Promise<Communication.FullStateResponse | ServerError>;
  setContent(thing: string, content: Communication.Content): Promise<ServerReturn>;
  deleteThing(thing: string): Promise<ServerReturn>;
  updateThings(
    things: {name: string; content: Communication.Content; children: {name: string; child: string}[]}[],
  ): Promise<ServerReturn>;
  getTutorialFinished(): Promise<boolean | ServerError>;
  setTutorialFinished(): Promise<ServerReturn>;
}

export interface Server extends Storage {
  getUsername(): Promise<string | null | ServerError>;
  onChanges(callback: (changes: string[]) => void): () => void;
  getThingData(thing: string): Promise<Communication.ThingData | null | ServerError>;
  deleteAccount(account: string): Promise<ServerReturn>;
  getEmail(): Promise<string | ServerError>;
  setEmail(email: string): Promise<ServerReturn>;
  setPassword(password: string): Promise<ServerReturn>;
  setToolbarState({shown}: {shown: boolean}): Promise<ServerReturn>;
  getToolbarState(): Promise<{shown: boolean} | ServerError>;
  logOutUrl: string;
}

export function isStorageServer(storage: Storage | Server): storage is Server {
  return (storage as any).getUsername !== undefined;
}
