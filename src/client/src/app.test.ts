/// <reference types="@types/jest" />

import * as A from "./app";
import * as W from "./wrapap";

import {expectViewToMatch} from "./app/test-utils";

describe("initializing app from scratch with 'of'", () => {
  const wpp = W.of({
    "0": {content: ["Item 0"], children: ["1", "2"]},
    "1": {content: ["Item 1 with link to ", {link: "0"}]},
    "2": {content: ["Item 2"], children: ["2"]},
  });

  test("zooms in on the root item", () => {
    expect(wpp.root.content).toEqual(["Item 0"]);
  });

  test("sets the content of each item", () => {
    expect(wpp.root.content).toEqual(["Item 0"]);
    expect(wpp.root.child(0)?.content).toEqual(["Item 1 with link to ", {link: "0", title: "Item 0"}]);
    expect(wpp.root.child(1)?.content).toEqual(["Item 2"]);
  });
});

describe("links and references", () => {
  describe("when one item links to another multiple times, it's shown only once in the references", () => {
    const app = W.of({
      "0": {content: ["Root"], children: ["1"]},
      "1": {content: ["Item 1"]},
      "2": {content: ["This item links to ", {link: "1"}, " twice: ", {link: "1"}]},
    });

    const expanded = app.root.child(0)?.expand()!;
    // .send({type: "toggle-references", id: app.root.child(0)?.item.id!})!;

    test("the references section has the linking item", () => {
      expect(expanded.root.child(0)?.references.map((r) => r.content)).toEqual([
        ["This item links to ", {link: "1", title: "Item 1"}, " twice: ", {link: "1", title: "Item 1"}],
      ]);
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
});

describe("tree-graph consistency", () => {
  // Bug: Adding a child would cause all clones to be collapsed.
  //
  // Bug: The child would be inserted in a different order in each clone when
  // using 'new-child'.
  describe("creating a child is immediately reflected in other identical nodes in the tree", () => {
    const before = W.of({
      "0": {content: ["Item 0"], children: ["1", "1"]},
      "1": {content: ["Item 1"], children: ["2"]},
      "2": {content: ["Item 2"]},
    })
      .root.child(0)
      ?.expand()
      .root.child(1)
      ?.expand();

    const after = before?.root
      .child(0)
      ?.action("new-child")
      .focused?.edit({content: ["New child"]});

    describe("initially", () => {
      test("both copies of the parent are expanded", () => {
        expect(before?.root.child(0)?.expanded).toBe(true);
        expect(before?.root.child(1)?.expanded).toBe(true);
      });

      test("both copies of the parent have only one child", () => {
        expect(before?.root.child(0)?.childrenContents).toEqual([["Item 2"]]);
        expect(before?.root.child(1)?.childrenContents).toEqual([["Item 2"]]);
      });
    });

    describe("after creating child", () => {
      test("both copies of the parent have the new child", () => {
        expect(after?.root.child(0)?.childrenContents).toEqual([["New child"], ["Item 2"]]);
        expect(after?.root.child(1)?.childrenContents).toEqual([["New child"], ["Item 2"]]);
      });
    });
  });

  // Bug: Adding a parent would cause all clones to be collapsed.
  describe("adding a parent is immediately reflected in all identical nodes in the tree", () => {
    const before = W.of({
      "0": {content: ["Item 0"], children: ["1", "1"]},
      "1": {content: ["Item 1"], children: ["2"]},
      "2": {content: ["Item 2"]},
      "3": {content: ["Item 3"]},
    })
      .root.child(0)
      ?.expand()
      .root.child(1)
      ?.expand();

    const after = before?.root
      .child(0)
      ?.action("insert-parent")
      ?.send({topic: "popup", type: "query", query: "Item 3"})
      ?.send({topic: "popup", type: "select"});

    describe("initially", () => {
      test("both copies of the item are expanded", () => {
        expect(before?.root.child(0)?.expanded).toBe(true);
        expect(before?.root.child(1)?.expanded).toBe(true);
      });

      test("neither copy has any other parents", () => {
        expect(before?.root.child(0)?.item.otherParents).toEqual([]);
        expect(before?.root.child(1)?.item.otherParents).toEqual([]);
      });
    });

    describe("after creating child", () => {
      test("both copies are still expanded", () => {
        expect(after?.root.child(0)?.expanded).toBe(true);
        expect(after?.root.child(1)?.expanded).toBe(true);
      });

      test("both copies now have the new other parent", () => {
        expect(after?.root.child(0)?.item.otherParents.map((o) => o.text)).toEqual(["Item 3"]);
        expect(after?.root.child(1)?.item.otherParents.map((o) => o.text)).toEqual(["Item 3"]);
      });
    });
  });

  describe("indenting and destroying item", () => {
    const before = W.of({
      "0": {content: ["Item 0"], children: ["1", "2"]},
      "1": {content: ["Item 1"]},
      "2": {content: ["Item 2"]},
    });

    test("initially, the first item has no children and the root has two children", () => {
      expect(before?.root.childrenContents).toEqual([["Item 1"], ["Item 2"]]);
      expect(before?.root.child(0)?.childrenContents).toEqual([]);
    });

    const afterIndent = before?.root.child(1)?.action("indent");

    test("after indenting, the first item gains the second item as a child", () => {
      expect(afterIndent?.root.childrenContents).toEqual([["Item 1"]]);
      expect(afterIndent?.root.child(0)?.childrenContents).toEqual([["Item 2"]]);
    });

    const afterDestroy = afterIndent?.send({type: "action", action: "destroy"});

    test("after destroying the item, it's removed everywhere", () => {
      expect(afterDestroy?.root.childrenContents).toEqual([["Item 1"]]);
      expect(afterDestroy?.root.child(0)?.childrenContents).toEqual([]);
    });
  });

  describe("newly created sibling has focus", () => {
    const before = W.of({
      "0": {content: ["Item 0"], children: ["1"]},
      "1": {content: ["Item 1"]},
    });

    const after = before?.root.child(0)?.action("new");

    test("the new sibling is focused", () => {
      expect(after?.root.item.children.map((c) => c.hasFocus)).toEqual([false, true]);
    });
  });

  // Bug: Creating a child inside a collapsed parent would add that child twice
  // in the tree.
  describe("creating a child inside a collapsed parent", () => {
    const before = W.of({
      "0": {content: ["Item 0"], children: ["1"]},
      "1": {content: ["Item 1"], children: ["2"]},
      "2": {content: ["Item 2"]},
    });

    const after = before?.root.child(0)?.action("new-child");

    test("the selected item is initially collapsed", () => {
      expect(before?.root.child(0)?.expanded).toBe(false);
    });

    test("after adding new child, it becomes expanded", () => {
      expect(after?.root.child(0)?.expanded).toBe(true);
    });

    test("it has the correct children", () => {
      expect(after?.root.child(0)?.childrenContents).toEqual([[], ["Item 2"]]);
    });
  });

  describe("updates to the root item's parents list", () => {
    const step1 = W.of({
      "0": {content: ["Item 0"], children: ["1"]},
      "1": {content: ["Item 1"], children: []},
    });

    const step2 = step1?.root
      .child(0)
      ?.action("insert-child")
      .send({topic: "popup", type: "query", query: "Item 0"}, {topic: "popup", type: "select"});

    const step3 = step2?.root.child(0)?.child(0)?.action("remove");

    describe("adding the root item as child of parent item immediately updates list of parents", () => {
      test("the item is inserted as a child of its parent in the tree", () => {
        expect(step1?.root.child(0)?.childrenContents).toEqual([]);
        expect(step2?.root.child(0)?.childrenContents).toEqual([["Item 0"]]);
      });

      test("the parents list is updated with the new item", () => {
        expect(step1?.parentsContents).toEqual([]);
        expect(step2?.parentsContents).toEqual([["Item 1"]]);
      });
    });

    describe("removing the item again updates the parent list", () => {
      test("the item is removed from the tree", () => {
        expect(step3?.root.child(0)?.childrenContents).toEqual([]);
      });

      test("the parents list is updated", () => {
        expect(step3?.parentsContents).toEqual([]);
      });
    });

    describe("removing the item from the parent list", () => {
      const step4 = step2?.parent(0)?.action("remove");

      test("removes the item in the tree too", () => {
        expect(step4?.root.child(0)?.expanded).toBe(true);
        expect(step4?.root.child(0)?.childrenContents).toEqual([]);
      });
    });
  });
});

describe("moving items with drag and drop", () => {
  describe("moving an item out of a parent with multiple clones visible", () => {
    const before = W.of({
      "0": {content: ["Item 0"], children: ["1", "1"]},
      "1": {content: ["Item 1"], children: ["2"]},
      "2": {content: ["Item 2"]},
    })
      .root.child(0)
      ?.expand()
      .root.child(1)
      ?.expand();

    const after = before?.root.child(0)?.child(0)?.startDrag().root.child(0)?.endDrag();

    test("the item is removed from both subtrees", () => {
      expect(before?.root.child(0)?.childrenContents).toEqual([["Item 2"]]);
      expect(before?.root.child(1)?.childrenContents).toEqual([["Item 2"]]);

      expect(after?.root.child(0)?.childrenContents).toEqual([]);
      expect(after?.root.child(1)?.childrenContents).toEqual([]);
    });

    test("the item is added to the new parent", () => {
      expect(before?.root.childrenContents).toEqual([["Item 1"], ["Item 1"]]);
      expect(after?.root.childrenContents).toEqual([["Item 2"], ["Item 1"], ["Item 1"]]);
    });
  });

  describe("moving an item into a parent with multiple clones visible", () => {
    const before = W.of({
      "0": {content: ["Item 0"], children: ["1", "1", "3"]},
      "1": {content: ["Item 1"], children: ["2"]},
      "2": {content: ["Item 2"]},
      "3": {content: ["Item 3"]},
    })
      .root.child(0)
      ?.expand()
      .root.child(1)
      ?.expand();

    const after = before?.root.child(2)?.startDrag().root.child(1)?.child(0)?.endDrag();

    test("the item is removed from its old parent", () => {
      expect(before?.root.childrenContents).toEqual([["Item 1"], ["Item 1"], ["Item 3"]]);
      expect(after?.root.childrenContents).toEqual([["Item 1"], ["Item 1"]]);
    });

    test("the item is added to both clones of its new parent", () => {
      expect(before?.root.child(0)?.childrenContents).toEqual([["Item 2"]]);
      expect(before?.root.child(1)?.childrenContents).toEqual([["Item 2"]]);

      expect(after?.root.child(0)?.childrenContents).toEqual([["Item 3"], ["Item 2"]]);
      expect(after?.root.child(1)?.childrenContents).toEqual([["Item 3"], ["Item 2"]]);
    });
  });
});

describe("the outline", () => {
  describe("clicking item bullet", () => {
    describe("of an opened link", () => {
      const step1 = W.of({
        "0": {content: ["Item 0"], children: ["1"]},
        "1": {content: ["Item 1 links to ", {link: "2"}]},
        "2": {content: ["Item 2"]},
      });

      const step2 = step1.root.child(0)?.toggleLink("2");

      describe("normal click", () => {
        const step3 = step2?.root.child(0)?.openedLinks[0]?.clickBullet();

        test("initially, the link is shown", () => {
          expect(step2?.root.child(0)?.openedLinks[0].content).toEqual(["Item 2"]);
        });

        test("after clicking the bullet, the link is hidden", () => {
          expect(step3?.root.child(0)?.openedLinks).toEqual([]);
        });
      });

      describe("alt click", () => {
        const step3 = step2?.root.child(0)?.openedLinks[0]?.clickBullet({alt: true});

        test("the root item is updated", () => {
          expect(step2?.root?.content).toEqual(["Item 0"]);
          expect(step3?.root?.content).toEqual(["Item 2"]);
        });
      });
    });

    describe("of a normal child item", () => {
      const before = W.of({
        "0": {content: ["Item 0"], children: ["1"]},
        "1": {content: ["Item 1"], children: ["2"]},
        "2": {content: ["Item 2"]},
      });

      describe("left click", () => {
        const after = before.root.child(0)?.clickBullet();

        test("expands the item", () => {
          expect(before.root.child(0)?.nchildren).toEqual(0);
          expect(after?.root.child(0)?.nchildren).toEqual(1);
        });

        test("completes the 'expand-item' goal", () => {
          expect(before.completed("expand-item")).toBe(false);
          expect(after?.completed("expand-item")).toBe(true);
        });
      });

      describe("alt click", () => {
        const after = before.root.child(0)?.clickBullet({alt: true});

        test("the root item is updated", () => {
          expect(before.root.content).toEqual(["Item 0"]);
          expect(after?.root.content).toEqual(["Item 1"]);
        });

        test("the 'jump-item' goal is completed", () => {
          expect(before.completed("jump-item")).toBe(false);
          expect(after?.completed("jump-item")).toBe(true);
        });
      });
    });

    describe("of a reference", () => {
      const before = W.of({
        "0": {content: ["Item 0"], children: ["1"]},
        "1": {content: ["Item 1"]},
        "2": {content: ["Item 2 links to ", {link: "1"}], children: ["3"]},
        "3": {content: ["Item 3"]},
      })
        .root.child(0)
        ?.clickBullet();

      describe("left click", () => {
        const after = before?.root.child(0)?.reference(0)?.clickBullet();

        test("expands the item", () => {
          expect(before?.root.child(0)?.reference(0)?.nchildren).toEqual(0);
          expect(after?.root.child(0)?.reference(0)?.nchildren).toEqual(1);
        });
      });

      describe("alt click", () => {
        const after = before?.root.child(0)?.reference(0)?.clickBullet({alt: true});

        test("the root item is updated", () => {
          expect(before?.root.content).toEqual(["Item 0"]);
          expect(after?.root.content).toEqual(["Item 2 links to ", {link: "1", title: "Item 1"}]);
        });
      });
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
      expect(after.focused?.content).toEqual(after.root.child(0)?.content);
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
          "0": {content: ["0"], children: ["1"]},
          "1": {content: ["1"], children: ["2", "3"]},
          "2": {content: ["2"], children: ["4"]},
          "3": {content: ["3"], children: ["5"]},
          "4": {content: ["4"]},
          "5": {content: ["5"]},
        });

        const after = before.root.child(0)!.edit().send({type: "action", action: "unfold"});

        const node = after.root.child(0);

        expect(node?.content).toEqual(["1"]);
        expect(node?.child(0)?.content).toEqual(["2"]);
        expect(node?.child(0)?.child(0)?.content).toEqual(["4"]);
        expect(node?.child(1)?.content).toEqual(["3"]);
        expect(node?.child(1)?.child(0)?.content).toEqual(["5"]);
      });
    });

    describe("when the outline contains loops", () => {
      const before = W.of({
        "0": {content: ["0"], children: ["1"]},
        "1": {content: ["1"], children: ["2"]},
        "2": {content: ["2"], children: ["0"]},
      });

      it("doesn't unfold the past the root", () => {
        const after = before.root.child(0)!.edit().send({type: "action", action: "unfold"});
        const node = after.root.child(0);

        expect(node?.content).toEqual(["1"]);
        expect(node?.child(0)?.content).toEqual(["2"]);
        expect(node?.child(0)?.child(0)?.content).toEqual(["0"]);
        expect(node?.child(0)?.child(0)?.child(0)?.content).toEqual(["1"]);
        expect(node!.child(0)!.child(0)!.child(0)!.expanded).toBe(false);
      });
    });
  });

  describe("item status", () => {
    test("an item with no connections has 'terminal' status", () => {
      const app = W.of({"0": {content: ["0"], children: ["1"]}, "1": {content: ["1"]}});
      expect(app.root.child(0)?.item.status).toEqual("terminal");
    });

    describe("an item that has only other parent connection is also 'terminal'", () => {
      const app = W.of({
        "0": {content: ["0"], children: ["1", "2"]},
        "1": {content: ["1"]},
        "2": {content: ["2"], children: ["1"]},
      });

      test("the item has another parent", () =>
        expect(app.root.child(0)?.item.otherParents.map((p) => p.text)).toEqual(["2"]));

      test("the item has 'terminal' status", () => expect(app.root.child(0)?.item.status).toEqual("terminal"));
    });

    describe("an item that is referenced from somewhere else", () => {
      const app = W.of({
        "0": {content: ["0"], children: ["1", "2"]},
        "1": {content: ["1"]},
        "2": {content: ["2, references ", {link: "1"}]},
      });

      test("starts out collapsed", () => {
        expect(app.root.child(0)?.item.status).toEqual("collapsed");
      });

      test("can be expanded", () => {
        const after = app.root.child(0)?.expand();
        expect(after?.root.child(0)?.item.status).toEqual("expanded");
      });
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

  describe("when actions are enabled", () => {
    describe.each(["find", "new"] as const)("an action that is always enabled", (action) => {
      const app = W.of({"0": {content: ["Root"]}});

      test("is enabled even with nothing selected", () => expect(app.actionEnabled(action)).toBe(true));
    });

    describe.each(["insert-sibling", "zoom", "indent", "new-child", "remove"] as const)(
      "an action that requires a target",
      (action) => {
        const unselected = W.of({"0": {content: ["Root"]}});
        const selected = unselected.root.edit();

        test("is disabled when no node is focused", () => expect(unselected.actionEnabled(action)).toBe(false));
        test("is enabled when a node is focused", () => expect(selected.actionEnabled(action)).toBe(true));
      },
    );
  });

  describe("creating a new sibling using the toolbar button", () => {
    describe("with nothing selected", () => {
      const app = W.of({"0": {content: ["Root"]}});
      const after = app.send({type: "action", action: "new"});

      test("a new item is inserted as a child of the root item", () => expect(after.root.nchildren).toEqual(1));
    });

    describe("when a node has focus", () => {
      const before = W.of({
        "0": {content: ["Root"], children: ["1", "2"]},
        "1": {content: ["Child 1"]},
        "2": {content: ["Child 2"]},
      })
        .root.child(0)
        ?.edit();

      const after = before?.send({type: "action", action: "new"});

      test("inserts a new sibling after the selected item", () => {
        expect(before?.root.childrenContents).toEqual([["Child 1"], ["Child 2"]]);
        expect(after?.root.childrenContents).toEqual([["Child 1"], [], ["Child 2"]]);
      });

      test("focuses the newly created item", () => {
        expect(after?.focused?.content).toEqual([]);
      });

      test("completes the 'create-item' goal", () => {
        expect(before?.completed("create-item")).toBe(false);
        expect(after?.completed("create-item")).toBe(true);
      });
    });
  });
});

describe("initializing with state loaded from storage", () => {
  const fullStateResponse1 = {
    things: [
      {name: "0", content: ["Item 0"], children: [{name: "0.1", child: "1"}]},
      {name: "1", content: ["Item 1"], children: []},
    ],
  };

  describe("the state is loaded correctly from the state response", () => {
    describe("in a simple example with two items", () => {
      const app = W.from(
        A.initialize({
          fullStateResponse: fullStateResponse1,
          toolbarShown: true,
          tutorialFinished: true,
          urlHash: null,
        }),
      );

      test("both of the items are shown", () => {
        expect(app.root.content).toEqual(["Item 0"]);
        expect(app.root.childrenContents).toEqual([["Item 1"]]);
      });
    });
  });

  describe("the URL", () => {
    describe("if the URL is non-null, the relevant item is automatically navigated to", () => {
      const app = W.from(
        A.initialize({
          fullStateResponse: fullStateResponse1,
          toolbarShown: true,
          tutorialFinished: false,
          urlHash: "#1",
        }),
      );

      test("the item is used as the root", () => {
        expect(app.root.content).toEqual(["Item 1"]);
        expect(app.parentsContents).toEqual([["Item 0"]]);
      });
    });

    describe("if the URL is an invalid item, the normal root is used", () => {
      const app = W.from(
        A.initialize({
          fullStateResponse: fullStateResponse1,
          toolbarShown: true,
          tutorialFinished: false,
          urlHash: "#3",
        }),
      );

      test("the default is used as the root", () => {
        expect(app.root.content).toEqual(["Item 0"]);
      });
    });
  });

  describe("the toolbar", () => {
    test("can be shown", () => {
      const app = W.from(
        A.initialize({
          fullStateResponse: fullStateResponse1,
          toolbarShown: true,
          tutorialFinished: false,
          urlHash: null,
        }),
      );

      expect(app.view.toolbar.shown).toBe(true);
    });

    test("can be hidden", () => {
      const app = W.from(
        A.initialize({
          fullStateResponse: fullStateResponse1,
          toolbarShown: false,
          tutorialFinished: false,
          urlHash: null,
        }),
      );

      expect(app.view.toolbar.shown).toBe(false);
    });
  });

  describe("the tutorial", () => {
    test("can be unfinished", () => {
      const app = W.from(
        A.initialize({
          fullStateResponse: fullStateResponse1,
          toolbarShown: true,
          tutorialFinished: false,
          urlHash: null,
        }),
      );

      expect(app.view.tutorial.open).toBe(true);
    });

    test("can be finished", () => {
      const app = W.from(
        A.initialize({
          fullStateResponse: fullStateResponse1,
          toolbarShown: true,
          tutorialFinished: true,
          urlHash: null,
        }),
      );

      expect(app.view.tutorial.open).toBe(false);
    });
  });
});

describe("changing the URL", () => {
  test("when the URL is changed to the empty string, the default root item is used", () => {
    const before = W.of({"0": {children: ["1"]}, "1": {}})
      .root.child(0)
      ?.action("zoom")!;
    const after = before.send({type: "urlChanged", hash: ""});

    expect(before.root.content).toEqual(["Item 1"]);
    expect(after.root.content).toEqual(["Item 0"]);
  });
});

describe("storage synchronization", () => {
  describe("example with updates, deletions and edits", () => {
    const step1 = W.of({
      "0": {content: ["Root"], children: ["1", "2"]},
      "1": {content: ["Child 1"]},
      "2": {content: ["Child 2"]},
    });

    const [step2, step2e] = step1.root
      .edit({content: ["Edited root item"]})
      .send({type: "flushChanges"})
      .effects();

    test("after editing item content, flushed changes contains the edit", () => {
      expect(step2e.changes).toEqual({
        deleted: [],
        edited: [{thing: "0", content: ["Edited root item"]}],
        updated: [],
        tutorialFinished: null,
      });
    });
  });
});

describe("server disconnect and reconnect", () => {
  describe("sending requests to reconnect to server", () => {
    const step1 = W.of({"0": {content: ["Root"]}});

    const [step2, step2e] = step1.send({type: "serverDisconnected"}).effects();

    test("after disconnecting, we will try to reconnect", () => {
      expect(step2e.tryReconnect).toBeTruthy();
    });

    test("the offline indicator is shown", () => {
      expect(step2.view.offlineIndicator.shown).toBe(true);
    });

    const [step3, step3e] = step2.send({type: "serverDisconnected"}).effects();

    test("if we are notified again of disconnection, we don't try again", () => {
      expect(step3e.tryReconnect).toBeFalsy();
    });

    const [step4, step4e] = step3.send({type: "serverPingResponse", result: "failed"}).effects();

    test("if the server is still down, we try again", () => {
      expect(step4e.tryReconnect).toBeTruthy();
    });

    test("the offline indicator is still shown", () => {
      expect(step4.view.offlineIndicator.shown).toBe(true);
    });

    const [step5, step5e] = step4
      .send({
        type: "serverPingResponse",
        result: "success",
        remoteState: {
          fullStateResponse: {things: [{name: "0", content: ["Root"], children: []}]},
          tutorialFinished: false,
        },
      })
      .effects();

    test("when the server comes back, we stop trying", () => {
      expect(step5e.tryReconnect).toBeFalsy();
    });

    test("the offline indicator is no longer shown", () => {
      expect(step5.view.offlineIndicator.shown).toBe(false);
    });
  });

  describe("the sync dialog", () => {
    test("isn't shown by default", () => {
      const app = W.of({"0": {content: ["Root"]}});
      expect(app.view.syncDialog.shown).toBe(false);
    });

    describe("when reconnecting after making changes locally", () => {
      const app = W.of({"0": {content: ["Root"]}})
        .send({type: "serverDisconnected"})
        .root.edit({content: ["Edited root"]})
        .send({
          type: "serverPingResponse",
          result: "success",
          remoteState: {
            fullStateResponse: {things: [{name: "0", content: ["Root"], children: []}]},
            tutorialFinished: false,
          },
        });

      test("the sync dialog is shown", () => {
        expect(app.view.syncDialog.shown).toBe(true);
      });

      test("it shows exactly one item edited", () => {
        expect((app.view.syncDialog as A.View["syncDialog"] & {shown: true}).summary).toEqual({
          deleted: 0,
          updated: 0,
          edited: 1,
        });
      });

      describe("if accepting local changes", () => {
        const after = app.send({type: "syncDialogSelect", option: "commit"});

        test("the edited item keeps its new value", () => {
          expect(after.root.content).toEqual(["Edited root"]);
        });
      });

      describe("if rejecting local changes", () => {
        const after = app.send({type: "syncDialogSelect", option: "abort"});

        test("the edited item is reverted to its old value", () => {
          expect(after.root.content).toEqual(["Root"]);
        });
      });
    });
  });
});

describe("receiving live updates from server", () => {
  describe("receiving an edited item while no changes were made locally", () => {
    const step1 = W.of({"0": {content: ["Root"]}});

    const step2 = step1.send({
      type: "receivedChanges",
      changes: [
        {
          thing: "0",
          data: {
            isPage: false,
            content: ["Edited root"],
            children: [{name: "0.1", child: "1"}],
          },
        },
        {
          thing: "1",
          data: {
            isPage: false,
            content: ["Child 1"],
            children: [],
          },
        },
      ],
    });

    test("resets the local state to reflect the new changes", () => {
      expect(step2.root.content).toEqual(["Edited root"]);
      expect(step2.root.childrenContents).toEqual([["Child 1"]]);
    });
  });

  describe("example with two clients", () => {
    const a1 = W.of({"0": {content: ["Root"]}});
    const b1 = W.of({"0": {content: ["Root"]}});

    const [a2, a2e] = a1.root
      .edit({content: ["Edited root"]})
      .send({type: "flushChanges"})
      .effects();
    const [b2, b2e] = b1.send({type: "flushChanges"}).effects();

    describe("after editing only the first client state, and then synchronizing changes simultaneously", () => {
      test("the first client pushes an update with the new content", () => {
        expect(a2e.changes).toEqual({
          deleted: [],
          edited: [{thing: "0", content: ["Edited root"]}],
          updated: [],
          tutorialFinished: null,
        });
      });

      test("the second client doesn't push any changes", () => {
        expect(b2e.changes).toBeUndefined();
      });
    });

    const [a3, a3e] = a2.send({type: "flushChanges"}).effects();
    const [b3, b3e] = b2
      .send({
        type: "receivedChanges",
        changes: [
          {
            thing: "0",
            data: {
              isPage: false,
              content: ["Edited root"],
              children: [],
            },
          },
        ],
      })
      .send({type: "flushChanges"})
      .effects();

    describe("once the second client receives changes, and both clients flush again", () => {
      test("the state of the second client is updated", () => {
        expect(b3.root.content).toEqual(["Edited root"]);
      });

      test("the first client does not push any changes", () => {
        expect(a3e.changes).toBeUndefined();
      });

      test("the second client does not push any changes", () => {
        expect(b3e.changes).toBeUndefined();
      });
    });
  });
});
