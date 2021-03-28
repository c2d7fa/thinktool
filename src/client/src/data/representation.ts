import {BinaryRelation} from "@johv/immutable-extras";

import {Content} from "./content";

export type Connection = {connectionId: string};

export interface ThingData {
  content: Content;
  children: Connection[];
  parents: Connection[];
}

export interface ConnectionData {
  parent: string;
  child: string;
}

// By convention, a field that is prefixed with an underscore is understood to
// be "module private"; that is, is may not be mentioned outside of a module in
// the same directory as this file.

export interface State {
  _things: {[id: string]: ThingData | undefined};
  _connections: {[connectionId: string]: ConnectionData | undefined};
  _links: BinaryRelation<string, string>;
}
