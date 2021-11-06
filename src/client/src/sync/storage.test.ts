/// <reference types="@types/jest" />

import * as Storage from "./storage";

import * as W from "../wrapap";
import * as A from "../app";
import * as D from "../data";
import * as Tu from "../tutorial";

describe("calculating effects of updates", () => {
  describe("deleting an item", () => {
    const before = W.from(
      A.of({
        "0": {content: ["Item 0"], children: ["1"]},
        "1": {content: ["Item 1"]},
      }),
    );

    const after = before.root.child(0)!.destroy();

    const effects = Storage.Diff.changes(before.app, after.app);

    it("creates a 'deleted' effect for the given item", () => {
      expect(effects.deleted).toEqual(["1"]);
    });

    it("creates an 'updated' effect for the parent", () => {
      expect(effects.updated).toEqual([{name: "0", content: ["Item 0"], children: [], isPage: false}]);
    });
  });

  describe("creating a new item", () => {
    const before = W.from(
      A.of({
        "0": {content: ["Item 0"]},
      }),
    );

    const after = before.map((app) => A.createChild(app, before.root.ref));

    const child = after.root.child(0)!.thing;
    const connection = D.childConnections(after.state, after.root.thing)[0].connectionId;

    const effects = Storage.Diff.changes(before.app, after.app);

    it("creates an 'updated' effect for the parent", () => {
      expect(effects.updated).toContainEqual({
        name: "0",
        content: ["Item 0"],
        children: [{name: connection, child}],
        isPage: false,
      });
    });

    it("creates an 'updated' effect for the child", () => {
      expect(effects.updated).toContainEqual({name: child, content: [], children: [], isPage: false});
    });
  });

  describe("editing an item", () => {
    const before = W.from(
      A.of({
        "0": {content: ["Item 0"], children: ["1"]},
        "1": {content: ["Item 1"]},
      }),
    );

    const after = before.root.child(0)!.edit({content: ["Edited"], selection: {from: 6, to: 6}});

    const effects = Storage.Diff.changes(before.app, after.app);

    it("creates an 'edited' effect for the child", () => {
      expect(effects.edited).toEqual([{thing: "1", content: ["Edited"]}]);
    });

    it("doesn't create any other effects", () => {
      expect(effects.deleted).toEqual([]);
      expect(effects.updated).toEqual([]);
      expect(effects.tutorialFinished).toBeNull();
    });
  });

  describe("finishing the tutorial", () => {
    const before = A.of({});
    const after = A.merge(before, {tutorialState: Tu.initialize(true)});
    const effects = Storage.Diff.changes(before, after);

    it("creates a 'tutorialFinished' effect", () => {
      expect(effects.tutorialFinished).toBe(true);
    });
  });
});
