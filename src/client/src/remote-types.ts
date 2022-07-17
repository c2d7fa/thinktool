import {Communication} from "@thinktool/shared";

export type SerializableGraphState = {
  content: {[itemId: string]: {content: Communication.Content}};
  child: {[connectionId: string]: {parent: string; child: string}};
  itemDeleted: {[itemId: string]: {deleted: boolean}};
  connectionDeleted: {[connectionId: string]: {deleted: boolean}};
};

export type SerializableAppState = SerializableGraphState & {
  tutorialFinished: boolean;
  toolbarShown: boolean;
};

export type SerializableAppUpdate = Partial<SerializableAppState>;

export type SerializableAccountState = {
  username: boolean;
  logOutUrl: string;
  email: string;
};

export type SerializableAccountUpdate = {
  email?: string;
  password?: string;
  deleteAccount?: {account: string};
};

export type ServerError = {error: "disconnected"} | {error: "error"; status: number};

export interface Storage {
  load(): Promise<SerializableAppState | null>;
  push(update: SerializableAppUpdate): Promise<null | ServerError>;
}

export interface Server extends Storage {
  loadAccount(): Promise<SerializableAccountState | null>;
  pushAccount(update: SerializableAccountUpdate): Promise<ServerError | null>;
  subscribe(callback: (update: SerializableAppUpdate) => void): () => void;
}

export function isStorageServer(storage: Storage | Server): storage is Server {
  return (storage as any).onError !== undefined;
}
