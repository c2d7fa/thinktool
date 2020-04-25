import {State} from "./data";
import * as T from "./tree";
import {Tree} from "./tree";

export interface DragInfo {
  current: T.NodeRef | null;
  target: T.NodeRef | null;
  finished: boolean | "copy";
}

export interface Context {
  state: State;
  setState(value: State): void;
  setLocalState(value: State): void;
  updateLocalState(f: (value: State) => State): void;

  undo(): void;

  tree: Tree;
  setTree(value: Tree): void;

  drag: DragInfo;
  setDrag(value: DragInfo): void;

  selectedThing: string;
  setSelectedThing(value: string): void;

  activePopup: ((state: State, tree: Tree, target: T.NodeRef, selection: string) => [State, Tree]) | null;
  setActivePopup(
    callback: ((state: State, tree: Tree, target: T.NodeRef, selection: string) => [State, Tree]) | null,
  ): void;
  popupTarget: T.NodeRef | null;
  setPopupTarget(popupTarget: T.NodeRef | null): void;
  selectionInFocusedContent: {start: number; end: number} | null;
  setSelectionInFocusedContent(selection: {start: number; end: number} | null): void;
}
