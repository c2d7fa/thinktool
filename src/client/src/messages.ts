import {ActionName} from "./actions";

export type Message = {
  action: {action: ActionName};
  search: {search: {items: {thing: string; content: string}[]; query: string}};
};

export type Send = <K extends keyof Message>(tag: K, event: Message[K]) => void;
