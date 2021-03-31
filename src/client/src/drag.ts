import * as T from "./tree";
import * as A from "./app";

export type Drag = {active: false} | {active: true; dragging: T.NodeRef; hovering: T.NodeRef | null};

export const empty: Drag = {active: false};

export function drag(tree: T.Tree, node: {id: number}): Drag {
  if (T.kind(tree, node) !== "child") return {active: false};
  return {active: true, dragging: node, hovering: null};
}

export function hover(drag: Drag, node: {id: number} | null): Drag {
  if (node === null) return drag;
  if (!drag.active) return drag;
  return {...drag, hovering: node};
}

export function node(drag: Drag, node: T.NodeRef): null | "source" | "target" {
  if (!drag.active) return null;
  if (drag.hovering?.id === node.id) return "target";
  if (drag.dragging?.id === node.id) return "source";
  return null;
}

export function isActive(drag: Drag): drag is {active: true; dragging: T.NodeRef; hovering: T.NodeRef | null} {
  return drag.active;
}

export function drop(app: A.App, type: "move" | "copy"): A.App {
  if (!isActive(app.drag) || app.drag.hovering === null || T.kind(app.tree, app.drag.hovering) !== "child")
    return A.merge(app, {drag: empty});

  if (type === "copy") {
    const [state, tree, node] = T.copyToAbove(app.state, app.tree, app.drag.dragging, app.drag.hovering);
    return A.merge(app, {drag: empty, state: state, tree: T.focus(tree, node)});
  } else if (type === "move") {
    const [state, tree] = T.moveToAbove(app.state, app.tree, app.drag.dragging, app.drag.hovering);
    return A.merge(app, {drag: empty, state: state, tree});
  } else {
    throw "logic error";
  }
}
