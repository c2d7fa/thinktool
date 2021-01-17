/// <reference types="@types/jest" />

import * as Editor from "../src/ui/Editor";

import * as A from "../src/app";
import * as W from "../src/wrapap";

import * as D from "../src/data";
import * as T from "../src/tree";

describe("handling editor events", () => {
  describe("edits", () => {
    describe("editing a focused item", () => {
      const before = A.of({
        "0": {content: []},
      });

      const result = Editor.handling(
        before,
        W.from(before).root.ref,
      )({tag: "edit", editor: {content: ["Edited"], selection: {from: 6, to: 6}}, focused: true});

      const after = result.app;

      it("is handled", () => {
        expect(result.handled).toBe(true);
      });

      it("updates its content and selection", () => {
        expect(A.editor(before, W.from(before).root.ref)).toEqual({content: [], selection: {from: 0, to: 0}});
        expect(A.editor(after, W.from(after).root.ref)).toEqual({
          content: ["Edited"],
          selection: {from: 6, to: 6},
        });
      });

      it("causes it to become focused", () => {
        expect(T.hasFocus(before.tree, W.from(before).root.ref)).toBe(false);
        expect(T.hasFocus(after.tree, W.from(after).root.ref)).toBe(true);
      });
    });
  });
});
