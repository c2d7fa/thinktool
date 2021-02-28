import * as T from "./tree";

export interface Drag {
  current: T.NodeRef | null;
  target: T.NodeRef | null;
  finished: boolean | "copy";
}

export const empty: Drag = {current: null, target: null, finished: false};

export function result(
  drag: Drag,
): null | "cancel" | {dragged: T.NodeRef; dropped: T.NodeRef; type: "move" | "copy"} {
  if (!drag.finished) return null;
  if (drag.current === null || drag.target === null || drag.current.id === null) {
    // Q: Why do we have the last check here?
    return "cancel";
  }
  return {dragged: drag.current, dropped: drag.target, type: drag.finished === "copy" ? "copy" : "move"};
}

export function hover(drag: Drag, node: {id: number} | null): Drag {
  if (node === null) return drag;
  return {...drag, target: node};
}

export function end(drag: Drag, opts: {copy: boolean}): Drag {
  return {...drag, finished: opts.copy ? "copy" : true};
}

export function isDragging(drag: Drag): boolean {
  return drag.current !== null;
}
