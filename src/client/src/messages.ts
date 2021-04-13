import {ActionName} from "./actions";

export type Message = {
  action: {action: ActionName};
  search: {search: {items: {thing: string; content: string}[]; query: string}};
};
