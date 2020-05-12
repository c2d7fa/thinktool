import * as D from "./data";
import {General as G} from "thinktool-shared";

export type RoamImport = RoamImportPage[];
export type RoamImportPage = {title: string; children: RoamImportItem[]};
export type RoamImportItem = {string: string; uid?: string; children?: RoamImportItem[]};

function uid(thing: string) {
  return "tt" + thing;
}

function* bfsFromRoot(state: D.State) {
  // [TODO] Actually implement this algorithm! :)
  for (const thing in state.things) yield thing;
}

function exportData(state: D.State): RoamImport {
  let referencedItems: string[] = []; // Items that have been linked to OR which are the parents of an exported item
  let placedItems: string[] = []; // Items that have a parent in the Roam export

  function exportItem(thing: string): RoamImportItem {
    if (placedItems.includes(thing)) {
      // This item already has a parent in the exported data somewhere else.
      // Just place a reference to it here.
      return {string: `{{embed:((${uid(thing)}))}}`};
    } else {
      placedItems.push(thing);

      for (const parent of D.parents(state, thing)) {
        referencedItems.push(parent);
      }

      for (const link of D.content(state, thing).matchAll(/#([a-z0-9]+)/g)) {
        referencedItems.push(link[1]);
      }

      const exportedContent = D.content(state, thing).replace(/#([a-z0-9]+)/g, `((${uid("$1")}))`);

      return {
        string: exportedContent,
        uid: uid(thing),
        children: D.children(state, thing).map(exportItem),
      };
    }
  }

  const exportedRoot = exportItem("0");

  let i = 0;

  // [TODO] This exports some items that have parents as top-level children of
  // the "Imported items without parents", because it handles items in the wrong
  // order.
  //
  // We should only add items that truly have no parents here, but we should
  // still discover parents of other items. Perhaps having a separate discovery
  // step would be a good idea?

  let exportedLooseItems: RoamImportItem[] = [];
  while (i++ < 1000) {
    const nextLooseItem = G.setMinus(referencedItems, placedItems)[0];
    if (nextLooseItem === undefined) break;
    exportedLooseItems.push(exportItem(nextLooseItem));
  }
  if (i >= 1000) console.error("Loop terminated due to depth!!");

  return [
    {
      title: "Imported from Thinktool",
      children: [exportedRoot, {string: "Imported items without parents", children: exportedLooseItems}],
    },
  ];
}

export function exportString(state: D.State): string {
  return JSON.stringify(exportData(state));
}
