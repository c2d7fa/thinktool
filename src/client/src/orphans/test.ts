/// <reference types="@types/jest" />

import * as O from ".";
import * as A from "../app";

function render(items: A.ItemGraph): O.OrphansView {
  return O.view(O.scan(A.of(items)));
}

function contents(view: O.OrphansView): string[] {
  return view.items.map((item) => item.editor.content.join("")).sort();
}

describe("in a graph that consists of two disconnected trees", () => {
  const view = render({
    "0": {children: ["1", "2"]},
    "1": {children: ["3"]},
    "2": {children: ["4"]},
    "3": {},
    "4": {},

    "b0": {children: ["b1", "b2"]},
    "b1": {children: ["b3"]},
    "b2": {children: ["b4"]},
    "b3": {},
    "b4": {},
  });

  test("the orphans are exactly the roots of the disconnected tree", () => {
    expect(contents(view)).toEqual(["Item b0"]);
  });
});

describe("in a graph that consists of a loop connected to the root item", () => {
  const view = render({
    "0": {children: ["1"]},
    "1": {children: ["2"]},
    "2": {children: ["3"]},
    "3": {children: ["0"]},
  });

  test("there are no orphans", () => {
    expect(contents(view)).toEqual([]);
  });
});

describe("in a graph that consists of a disconnected loop", () => {
  const view = render({
    "0": {children: []},
    "1": {children: ["2"]},
    "2": {children: ["3"]},
    "3": {children: ["1"]},
  });

  test("there is exactly one orphan", () => {
    expect(contents(view).length).toEqual(1);
  });

  test("all orphans are in the unrooted tree", () => {
    expect(
      contents(view)
        .map((item) => ["Item 1", "Item 2", "Item 3"].includes(item))
        .reduce((a, b) => a && b),
    ).toBe(true);
  });
});

test("creating an item and then removing it adds it to the inbox", () => {
  let app = A.of({});
  app = A.update(app, {type: "focus", id: (A.view(app) as A.Outline).root.id});
  app = A.update(app, {type: "action", action: "new-child"});
  app = A.update(app, {
    id: A.focusedId(app)!,
    type: "edit",
    focused: true,
    editor: {content: ["Added item"], selection: {from: 0, to: 0}},
  });
  app = A.update(app, {type: "action", action: "remove"});
  app = A.update(app, {type: "action", action: "view-orphans"});

  expect(O.view(app).items).toMatchObject([
    {kind: "root", status: "terminal", editor: {content: ["Added item"]}, children: []},
  ]);
});

describe("clicking on another parent in the inbox view jumps there", () => {
  let before = A.of({
    "0": {content: ["Item 0"]},
    "1": {children: ["3"], content: ["Item 1"]},
    "2": {children: ["3"], content: ["Item 2"]},
    "3": {content: ["Item 3"]},
  });
  before = A.update(before, {type: "action", action: "view-orphans"});

  describe("after expanding the first item in the inbox", () => {
    const id = O.view(before).items[0].id;
    const afterExpanding = A.update(before, {type: "click-bullet", id, alt: false});

    test("the item at [0][0] has the other parent shown", () => {
      expect(O.view(afterExpanding).items[0].children[0]).toMatchObject({
        otherParents: [{text: "Item 1", id: "1"}],
      });
    });

    describe("after clicking on the other parent", () => {
      const afterClick = A.update(afterExpanding, {
        type: "click-parent",
        thing: "1",
        alt: false,
      });

      test("the outline tab is shown", () => {
        expect(A.view(afterClick).tab).toEqual("outline");
      });

      test("the outline jumps to that parent", () => {
        expect((A.view(afterClick) as A.Outline).root.editor.content).toMatchObject(["Item 1"]);
      });
    });
  });
});

describe("executing 'new' action on an item in the inbox inserts a new child", () => {
  const app = A.after(
    {
      "0": {content: ["Item 0"]},
      "1": {content: ["Item 1"]},
    },
    [
      {type: "action", action: "view-orphans"},
      (view) => ({type: "focus", id: (view as O.OrphansView).items[0].id}),
      {type: "action", action: "new"},
    ],
  );

  test("creates an empty, focused item", () => {
    expect((A.view(app) as O.OrphansView).items[0].children[0]).toMatchObject({
      hasFocus: true,
      editor: {content: [], selection: {from: 0, to: 0}},
    });
  });
});

// Bug: The newly created item would have the wrong content after switching the
// view back to the outline tab.
describe("after placing the cursor in an existing item, creating a new item", () => {
  const app = A.after(
    {
      "0": {content: ["Root"], children: ["1"]},
      "1": {content: ["Item"]},
    },
    [
      (view) => ({
        type: "edit",
        id: (view as A.Outline).root.children[0].id,
        focused: true,
        editor: {content: ["Item"], selection: {from: 0, to: 0}},
      }),
      {type: "action", action: "new-before"},
    ],
  );

  const contentBefore = (A.view(app) as A.Outline).root.children[0].editor.content;

  test("the new item is empty", () => {
    expect(contentBefore).toEqual([]);
  });

  describe("after switching the view back and forth", () => {
    const app2 = A.after(app, [
      {type: "action", action: "view-orphans"},
      {type: "action", action: "view-outline"},
    ]);

    test("the new item is still empty", () => {
      expect((A.view(app2) as A.Outline).root.children[0].editor.content).toEqual([]);
    });
  });
});

describe("when both a parent and its child is in the inbox", () => {
  const app = A.after(
    {
      "0": {content: ["Root"]},
      "1": {content: ["Inbox 1"], children: ["2"]},
      "2": {content: ["Inbox 2"]},
    },
    [
      {type: "action", action: "view-orphans"},
      (view) => ({
        type: "click-bullet",
        id: (view as O.OrphansView).items[0].id,
        alt: false,
      }),
    ],
  );

  test("both the parent and child are shown and neither has any other parents", () => {
    const view = A.view(app) as O.OrphansView;

    expect(view.items[0]).toMatchObject({
      kind: "root",
      status: "expanded",
      editor: {content: ["Inbox 1"]},
      otherParents: [],
    });

    expect(view.items[0].children[0]).toMatchObject({
      kind: "child",
      status: "terminal",
      editor: {content: ["Inbox 2"]},
      otherParents: [],
    });
  });

  describe("after destroying the parent item with the 'Destroy' button", () => {
    const appAfter = A.after(app, [
      {type: "orphans", event: {type: "destroy", id: (A.view(app) as O.OrphansView).items[0].id}},
    ]);

    const view = A.view(appAfter) as O.OrphansView;

    test("there is only one item in the inbox", () => {
      expect(view.items.length).toEqual(1);
    });

    test("the item in the child", () => {
      expect(view.items[0]).toMatchObject({
        kind: "root",
        status: "terminal",
        editor: {content: ["Inbox 2"]},
      });
    });

    test.skip("[known bug] it has no other parents", () => {
      expect(view.items[0].otherParents).toEqual([]);
    });
  });

  describe.skip("[known bug] after destroying the parent through the editor", () => {
    const appAfter = A.after(app, [
      {type: "focus", id: (A.view(app) as O.OrphansView).items[0].id},
      {type: "action", action: "destroy"},
    ]);

    const view = A.view(appAfter) as O.OrphansView;

    test("there is only one item in the inbox", () => {
      expect(view.items.length).toEqual(1);
    });

    test("the item in the child", () => {
      expect(view.items[0]).toMatchObject({
        kind: "root",
        status: "terminal",
        editor: {content: ["Inbox 2"]},
      });
    });

    test("it has no other parents", () => {
      expect(view.items[0].otherParents).toEqual([]);
    });
  });
});
