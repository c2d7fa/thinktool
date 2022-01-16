import * as A from "../app";
import * as D from "../data";
import * as P from "../popup";
import * as Immutable from "immutable";

const _ids = Symbol("ids");

export type OrphansState = {[_ids]: Immutable.Set<string>};

export type OrphanListItem = {
  title: string;
  thing: string;
  parents: {id: string; text: string}[];
  hasChildren: boolean;
};

export type OrphansView = {items: OrphanListItem[]};

export type OrphansEvent =
  | {type: "destroy"; thing: string}
  | {type: "jump"; thing: string}
  | {type: "addParent"; thing: string};

// Find items not reacable from the root by following children, parents, links
// and references.
export function scan(graph: D.State): OrphansState {
  const reached = Immutable.Set<string>([]).asMutable();

  function reach(root: string): void {
    if (reached.has(root)) return;
    reached.add(root);
    for (const child of D.children(graph, root)) reach(child);
    for (const link of D.references(graph, root)) reach(link);
    for (const parents of D.parents(graph, root)) reach(parents);
    for (const reference of D.backreferences(graph, root)) reach(reference);
  }

  reach(D.root(graph));

  return {[_ids]: Immutable.Set(D.allThings(graph)).subtract(reached)};
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
    const app_ = A.merge(app, {state, orphans: scan(state)});
    return A.jump(A.switchTab(app_, "outline"), parent);
  }

  if (event.type === "destroy") {
    return destroy(app, event.thing);
  } else if (event.type === "addParent") {
    return A.merge(app, {
      popup: P.open(app.popup, {
        query: "",
        select(app, parent) {
          return addParent(app, event.thing, parent);
        },
        icon: "insert",
      }),
    });
  } else if (event.type === "jump") {
    return A.jump(A.switchTab(app, "outline"), event.thing);
  } else {
    const unreachable: never = event;
    return unreachable;
  }
}

export function view(graph: D.State, state: OrphansState): OrphansView {
  return {
    items: state[_ids]
      .map((thing) => ({
        title: D.contentText(graph, thing),
        thing,
        parents: D.parents(graph, thing).map((p) => ({id: p, text: D.contentText(graph, p)})),
        hasChildren: D.hasChildrenOrReferences(graph, thing),
      }))
      .toArray()
      .sort((a, b) => a.title.localeCompare(b.title)),
  };
}
