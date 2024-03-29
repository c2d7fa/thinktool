import * as A from "../app";
import * as D from "../data";
import * as T from "../tree";
import * as Immutable from "immutable";

const _nodes = Symbol("nodes");

export type OrphansState = {[_nodes]: Immutable.Map<string, number>};

export const empty = {[_nodes]: Immutable.Map<string, number>()};

export type OrphansView = {items: A.Item[]};

export type OrphansEvent =
  | {type: "destroy"; id: number}
  | {type: "jump"; id: number}
  | {type: "addParent"; id: number}
  | {type: "item"; event: A.ItemEvent};

// Find items not reacable from the root by following children, parents, links
// and references.
export function scan(app: A.App): A.App {
  const reached = Immutable.Set<string>([]).asMutable();

  function reach(root: string): void {
    if (reached.has(root)) return;
    reached.add(root);
    for (const child of D.children(app.state, root)) reach(child);
    for (const link of D.references(app.state, root)) reach(link);
    for (const parents of D.parents(app.state, root)) reach(parents);
    for (const reference of D.backreferences(app.state, root)) reach(reference);
  }

  reach(D.root(app.state));

  let ids = Immutable.Set(D.allThings(app.state)).subtract(reached);

  // Iteratively remove items that also have a parent in the inbox
  let previousIds = ids;
  let prunings = Immutable.Map<string, string>();
  do {
    previousIds = ids;
    for (const id of ids) {
      const parents = D.parents(app.state, id);
      const parentsInInbox = parents.filter((parent) => ids.has(parent) || prunings.has(parent));
      const parentsInInboxWithoutCycles = parentsInInbox.filter((parent) => {
        function isLoop(parent: string): boolean {
          if (parent === id) return true;
          const prunedReason = prunings.get(parent);
          if (!prunedReason) return false;
          if (prunings.get(parent) === id) return true;
          return isLoop(prunings.get(parent) || parent);
        }
        return !isLoop(parent);
      });
      if (parentsInInboxWithoutCycles.length > 0) {
        prunings = prunings.set(id, parentsInInbox[0]);
        ids = ids.delete(id);
        break;
      }
    }
  } while (ids.size < previousIds.size);

  // Don't update unless necessary, so user doesn't lose tree state, like
  // expanded/collapsed items or editor states when scan is called unnecssarily.
  if (
    ids.equals(app.orphans[_nodes].keySeq().toSet()) &&
    app.orphans[_nodes].every((id) => T.exists(app.tree, {id}))
  )
    return app;

  let nodes = Immutable.Map<string, number>();

  let tree = app.tree;
  for (const id of ids) {
    let node: T.NodeRef;
    [node, tree] = T.load(app.state, tree, id, {type: "root"});
    nodes = nodes.set(id, node.id);
  }

  return A.merge(app, {orphans: {[_nodes]: nodes}, tree});
}

export function handle(app: A.App, event: OrphansEvent): {app: A.App; effects?: A.Effects} {
  if (event.type === "destroy") {
    const [state, tree] = T.removeThing(app.state, app.tree, {id: event.id});
    return {app: scan(A.merge(app, {state, tree: T.unfocus(tree)}))};
  } else if (event.type === "addParent") {
    return A.openPopup(app, {verb: "insertParent", subject: {id: event.id}});
  } else if (event.type === "jump") {
    return {app: A.jump(app, T.thing(app.tree, {id: event.id}))};
  } else if (event.type === "item") {
    return A.handle(app, event.event);
  } else {
    const unreachable: never = event;
    return unreachable;
  }
}

export function orphansMayBeStale(before: A.App, after: A.App): boolean {
  return before.tab === "orphans" && after.tab === "orphans" && before.state !== after.state;
}

export function view(app: A.App): OrphansView {
  return {
    items: app.orphans[_nodes]
      .valueSeq()
      .map((id) => A.itemFromNode(app, {id}))
      .toArray()
      .sort((a, b) => -T.thing(app.tree, {id: a.id}).localeCompare(T.thing(app.tree, {id: b.id}))),
  };
}
