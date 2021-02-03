export {State, Connection, ThingData, ConnectionData} from "./data/representation";

export {
  empty,
  allThings,
  connectionParent,
  connectionChild,
  childConnections,
  content,
  setContent,
  insertChild,
  removeChild,
  create,
  forget,
  exists,
  parents,
  isPage,
  togglePage,
  children,
  hasChildren,
  addChild,
  remove,
  otherParents,
} from "./data/core";

export {Content, references, backreferences, contentText, contentEq} from "./data/content";
