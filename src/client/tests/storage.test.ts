/// <reference types="@types/jest" />

import * as Storage from "../src/storage";

import * as W from "../src/wrapap";
import * as A from "../src/app";

describe("calculating effects of updates", () => {
  describe("deleting an item", () => {
    const before = W.from(
      A.of({
        "0": {content: ["Item 0"], children: ["1"]},
        "1": {content: ["Item 1"]},
      }),
    );

    const after = before.root.child(0).destroy();

    const effects = Storage.Diff.effects(before.state, after.state);

    it("creates a 'deleted' effect for the given item", () => {
      expect(effects.deleted).toEqual(["1"]);
    });

    it("creates an 'updated' effect for the parent", () => {
      expect(effects.updated).toEqual([{name: "0", content: ["Item 0"], children: [], isPage: false}]);
    });
  });
});
