import * as A from "../app";
import * as D from "../data";
import * as P from "../popup";
import * as T from "../tree";
import * as Immutable from "immutable";

const _ids = Symbol("ids");
const _tree = Symbol("tree");

export type OrphansState = {[_ids]: Immutable.Set<string>; [_tree]?: T.Tree};

export const empty = {[_ids]: Immutable.Set<string>()};

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

  const ids = Immutable.Set(D.allThings(app.state)).subtract(reached);
  let tree = app.tree;
  for (const id of ids) {
    tree = T.load(app.state, tree, id, {type: "root"})[1];
  }

  return A.merge(app, {orphans: {[_ids]: ids}, tree});
}

function removeOrphanWithoutRefresh(orphans: OrphansState, id: string): OrphansState {
  return {[_ids]: orphans[_ids].filter((id_) => id_ !== id)};
}

export function update(app: A.App, event: OrphansEvent): A.App {
  function destroy(app: A.App, thing: string): A.App {
    return A.merge(app, {
      state: D.remove(app.state, thing),
      orphans: removeOrphanWithoutRefresh(app.orphans, thing),
    });
  }

  function addParent(app: A.App, thing: string, parent: string): A.App {
    const state = D.addChild(app.state, parent, thing)[0];
    const app_ = scan(A.merge(app, {state}));
    return A.jump(A.switchTab(app_, "outline"), parent);
  }

  if (event.type === "destroy") {
    return destroy(app, T.thing(app.tree, {id: event.id}));
  } else if (event.type === "addParent") {
    // [TODO] This doesn't actually work, because we need to emit "search"
    // effect too.
    return A.merge(app, {
      popup: P.open(app.popup, {
        query: "",
        select(app, parent) {
          return addParent(app, T.thing(app.tree, {id: event.id}), parent);
        },
        icon: "insert",
      }),
    });
  } else if (event.type === "jump") {
    return A.jump(A.switchTab(app, "outline"), T.thing(app.tree, {id: event.id}));
  } else if (event.type === "item") {
    return A.update(app, event);
  } else {
    const unreachable: never = event;
    return unreachable;
  }
}

export function view(app: A.App): OrphansView {
  return {
    items: app.orphans[_ids]
      .map((thing) => A.itemFromNode(app, {id: T.instances(app.tree, thing).first()!.id}))
      .toArray()
      .sort((a, b) => a.editor.content.join("").localeCompare(b.editor.content.join(""))),
  };
}
