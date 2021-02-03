import {Content} from "./content";

export type Connection = {connectionId: string};

export interface ThingData {
  content: Content;
  children: Connection[];
  parents: Connection[];
  isPage: boolean;
}

export interface ConnectionData {
  parent: string;
  child: string;
}

export interface State {
  things: {[id: string]: ThingData | undefined};
  connections: {[connectionId: string]: ConnectionData | undefined};
}
