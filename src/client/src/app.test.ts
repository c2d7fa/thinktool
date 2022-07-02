/// <reference types="@types/jest" />

import * as W from "./wrapap";
import {expectViewToMatch} from "./app/test-utils";

describe("initializing app from scratch with 'of'", () => {
  const wpp = W.of({
    "0": {content: ["Item 0"], children: ["1", "2"]},
    "1": {content: ["Item 1 with link to ", {link: "0"}]},
    "2": {content: ["Item 2"], children: ["2"]},
  });

  test("zooms in on the item with ID '0'", () => {
    expect(wpp.root.thing).toEqual("0");
  });

  test("sets the content of each item", () => {
    expect(wpp.root.content).toEqual(["Item 0"]);
    expect(wpp.root.child(0)?.content).toEqual(["Item 1 with link to ", {link: "0", title: "Item 0"}]);
    expect(wpp.root.child(1)?.content).toEqual(["Item 2"]);
  });
});

describe("after jumping to an item by middle clicking its bullet", () => {
  const before = W.of({
    "0": {content: ["Item 0"], children: ["1"]},
    "1": {content: ["Item 1"]},
  });

  const after = before.send({type: "click-bullet", id: before.root.child(0)!.ref.id, alt: true});

  test("the root item is updated", () => {
    expect(before.root.thing).toBe("0");
    expect(after.root.thing).toBe("1");
  });

  test("the 'jump-item' goal is completed", () => {
    expect(before.completed("jump-item")).toBe(false);
    expect(after.completed("jump-item")).toBe(true);
  });
});

describe("when toggling a link", () => {
  const initial = W.of({
    "0": {content: ["This item has a link to ", {link: "1"}, "."]},
    "1": {content: ["Another Item"]},
  });

  const expanded = initial.root.toggleLink("1");

  const collapsed = expanded.root.toggleLink("1");

  describe("when the link is first toggled", () => {
    test("the linked item is added as an opened link", () => {
      expect(initial.root.openedLinks.length).toBe(0);
      expect(expanded.root.openedLinks.length).toBe(1);
    });

    test("the 'expand-link' goal is completed", () => {
      expect(initial.completed("expand-link")).toBe(false);
      expect(expanded.completed("expand-link")).toBe(true);
    });
  });

  describe("when the link is collapsed", () => {
    test("the linked item is removed", () => {
      expect(expanded.root.openedLinks.length).toBe(1);
      expect(collapsed.root.openedLinks.length).toBe(0);
    });

    test("the goal remains completed", () => {
      expect(expanded.completed("expand-link")).toBe(true);
      expect(collapsed.completed("expand-link")).toBe(true);
    });
  });
});

describe("inserting a link in an editor", () => {
  const before = W.of({
    "0": {content: ["This is item 0."]},
    "1": {content: ["This is item 1."]},
  }).root.edit({selection: {from: 8, to: 14}});

  const after = before.send(
    {type: "action", action: "insert-link"},
    {topic: "popup", type: "query", query: "This is item 1"},
    {topic: "popup", type: "select"},
  );

  it("updates the content so the selection is replaced with the link", () => {
    expect(before.root.content).toEqual(["This is item 0."]);
    expect(after.root.content).toEqual(["This is ", {link: "1", title: "This is item 1."}, "."]);
  });

  it("sets the selection to be after the inserted link", () => {
    expect(before.selection).toEqual({from: 8, to: 14});
    expect(after.selection).toEqual({from: 9, to: 9});
  });
});

describe("after creating a new child", () => {
  const before = W.of({
    "0": {content: ["Item 0"]},
  });

  const after = before.root.edit().send({type: "action", action: "new-child"});

  test("the parent item gets a new child", () => {
    expect(before.root.nchildren).toBe(0);
    expect(after.root.nchildren).toBe(1);
  });

  test("the child is focused", () => {
    expect(after.focused?.thing).toEqual(after.root.child(0)?.thing);
  });
});

describe("unfolding an item", () => {
  describe("when the item has no children", () => {
    const before = W.of({
      "0": {content: []},
    });

    const after = before.send({type: "unfold"});

    it("doesn't add any new children", () => {
      expect(before.root.expanded && before.root.nchildren).toBe(0);
      expect(after.root.expanded && after.root.nchildren).toBe(0);
    });
  });

  describe("when the outline is strictly a tree", () => {
    it("expands the parent", () => {
      const before = W.of({
        "0": {content: [], children: ["1"]},
        "1": {content: [], children: ["2"]},
        "2": {content: []},
      });

      const after = before.root.child(0)!.edit().send({type: "action", action: "unfold"});

      expect(before.root.child(0)!.expanded).toBe(false);
      expect(after.root.child(0)!.expanded).toBe(true);
    });

    it("expands each of the children", () => {
      const before = W.of({
        "0": {content: [], children: ["1"]},
        "1": {content: [], children: ["2", "3"]},
        "2": {content: [], children: ["4"]},
        "3": {content: [], children: ["5"]},
        "4": {content: []},
        "5": {content: []},
      });

      const after = before.root.child(0)!.edit().send({type: "action", action: "unfold"});

      const node = after.root.child(0);

      expect(node!.thing).toBe("1");
      expect(node!.child(0)!.thing).toBe("2");
      expect(node!.child(0)!.child(0)!.thing).toBe("4");
      expect(node!.child(1)!.thing).toBe("3");
      expect(node!.child(1)!.child(0)!.thing).toBe("5");
    });
  });

  describe("when the outline contains loops", () => {
    const before = W.of({
      "0": {content: [], children: ["1"]},
      "1": {content: [], children: ["2"]},
      "2": {content: [], children: ["0"]},
    });

    it("doesn't unfold the past the root", () => {
      const after = before.root.child(0)!.edit().send({type: "action", action: "unfold"});
      const node = after.root.child(0);

      expect(node!.thing).toBe("1");
      expect(node!.child(0)!.thing).toBe("2");
      expect(node!.child(0)!.child(0)!.thing).toBe("0");
      expect(node!.child(0)!.child(0)!.child(0)!.thing).toBe("1");
      expect(node!.child(0)!.child(0)!.child(0)!.expanded).toBe(false);
    });
  });
});

describe("the search popup", () => {
  describe("when opening popup while text is selected", () => {
    const before = W.of({
      "0": {content: ["Root item"], children: ["1", "2"]},
      "1": {content: ["This item references Another item."]},
      "2": {content: ["Another item"]},
    })
      .root.child(0)
      ?.edit({selection: {from: 21, to: 33}})!;

    describe("after beginning a search for an item", () => {
      const after = before.send({type: "action", action: "find"});

      test("the popup has the search icon", () => {
        expectViewToMatch(after, {popup: {icon: "find"}});
      });

      test("the selected text is inserted as the query in the popup", () => {
        expectViewToMatch(after, {popup: {query: "Another item"}});
      });

      test("results are popuplated", () => {
        expectViewToMatch(after, {popup: {results: [{content: ["Another item"]}]}});
      });

      test("the first match is selected", () => {
        expectViewToMatch(after, {popup: {results: [{isSelected: true}]}});
      });
    });
  });

  describe("searching for and selecting an item", () => {
    const before = W.of({
      "0": {content: ["Root item"], children: ["1", "2"]},
      "1": {content: ["Some item"]},
      "2": {content: ["Another item"]},
    })
      .root.child(0)
      ?.edit()!;

    describe("at first", () => {
      test("the popup is closed", () => {
        expectViewToMatch(before, {popup: {open: false}});
      });

      test("the root item has two children", () => {
        expectViewToMatch(before, {
          root: {children: [{editor: {content: ["Some item"]}}, {editor: {content: ["Another item"]}}]},
        });
      });
    });

    const afterOpeningPopup = before.send({type: "action", action: "insert-sibling"});

    describe("after triggering the 'insert sibling' action", () => {
      test("the popup is shown", () => {
        expectViewToMatch(afterOpeningPopup, {popup: {open: true}});
      });

      test("the query text is empty", () => {
        expectViewToMatch(afterOpeningPopup, {popup: {query: ""}});
      });
    });

    const afterQuery = afterOpeningPopup.send({topic: "popup", type: "query", query: "Another item"});

    describe("after searching for an item", () => {
      test("the query text is updated", () => {
        expectViewToMatch(afterQuery, {popup: {query: "Another item"}});
      });

      test("the matching item is the first result", () => {
        expectViewToMatch(afterQuery, {popup: {results: [{content: ["Another item"], isSelected: true}]}});
      });
    });

    const afterSelecting = afterQuery.send({topic: "popup", type: "select"});

    describe("after selecting an item", () => {
      test("the popup is closed", () => {
        expectViewToMatch(afterSelecting, {popup: {open: false}});
      });

      test("the selected item is inserted as a sibling and gains focus", () => {
        expectViewToMatch(afterSelecting, {
          root: {
            children: [
              {editor: {content: ["Some item"]}, hasFocus: false},
              {editor: {content: ["Another item"]}, hasFocus: true},
              {editor: {content: ["Another item"]}, hasFocus: false},
            ],
          },
        });
      });
    });
  });
});

describe("the tutorial", () => {
  test("the steps of the tutorial are correct", () => {
    const step1 = W.of({"0": {content: ["Root"]}});
    const step2 = step1.send({topic: "tutorial", type: "next"});
    const step3 = step2.send({topic: "tutorial", type: "next"});
    const step4 = step3.send({topic: "tutorial", type: "next"});
    const step5 = step4.send({topic: "tutorial", type: "next"});
    const step6 = step5.send({topic: "tutorial", type: "next"});

    expectViewToMatch(step1, {tutorial: {step: "Getting started"}});
    expectViewToMatch(step2, {tutorial: {step: "Multiple parents"}});
    expectViewToMatch(step3, {tutorial: {step: "Bidirectional linking"}});
    expectViewToMatch(step4, {tutorial: {step: "Reorganizing"}});
    expectViewToMatch(step5, {tutorial: {step: "Navigation"}});
    expectViewToMatch(step6, {tutorial: {step: "The end"}});
  });

  test("after stepping through all steps, the tutorial is closed", () => {
    const step1 = W.of({"0": {content: ["Root"]}});
    const step7 = step1.send(
      {topic: "tutorial", type: "next"},
      {topic: "tutorial", type: "next"},
      {topic: "tutorial", type: "next"},
      {topic: "tutorial", type: "next"},
      {topic: "tutorial", type: "next"},
      {topic: "tutorial", type: "next"},
    );

    expectViewToMatch(step1, {tutorial: {open: true}});
    expectViewToMatch(step7, {tutorial: {open: false}});
  });
});

describe("placeholder item", () => {
  test("a placeholder item is shown when the current root item has no children", () => {
    const app = W.of({"0": {content: ["Root"]}});
    expectViewToMatch(app, {tab: "outline", root: {isPlaceholderShown: true}});
  });

  test("a placeholder item isn't shown when the current root item already has children", () => {
    const app = W.of({"0": {content: ["Root"], children: ["1"]}, "1": {content: ["Child"]}});
    expectViewToMatch(app, {tab: "outline", root: {isPlaceholderShown: false}});
  });

  describe("clicking the placeholder item", () => {
    const before = W.of({"0": {content: ["Root"]}});
    const after = before.send({type: "click-placeholder"});

    describe("initially", () => {
      test("the root item has no children", () =>
        expectViewToMatch(before, {tab: "outline", root: {children: []}}));

      test("nothing is focused", () => expect(before.focused).toBeUndefined());
    });

    describe("after clicking", () => {
      test("the root item has one child", () =>
        expectViewToMatch(after, {tab: "outline", root: {children: [{editor: {content: []}}]}}));

      test("the child item is focused", () =>
        expectViewToMatch(after, {tab: "outline", root: {children: [{hasFocus: true}]}}));
    });
  });
});

describe("the toolbar", () => {
  describe("toggling the toolbar", () => {
    const step1 = W.of({"0": {content: ["Root"]}});
    const step2 = step1.send({type: "toggleToolbar"});
    const step3 = step2.send({type: "toggleToolbar"});

    test("the toolbar is initially shown", () => expectViewToMatch(step1, {toolbar: {shown: true}}));
    test("the toolbar is hidden after toggling it", () => expectViewToMatch(step2, {toolbar: {shown: false}}));
    test("the toolbar is shown after toggling it again", () => expectViewToMatch(step3, {toolbar: {shown: true}}));
  });
});
