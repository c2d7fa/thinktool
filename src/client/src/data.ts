export {State, Connection} from "./data/representation";

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
  children,
  hasChildren,
  addChild,
  remove,
  otherParents,
  transformFullStateResponseIntoState,
  diff,
} from "./data/core";

export {Content, references, backreferences, contentText, contentEq} from "./data/content";
