/// <reference types="@types/jest" />

import * as D from "../src/data";
import * as T from "../src/tree";
import * as A from "../src/app";

import * as E from "../src/editing";

describe("paragraphs", () => {
  test("Single line is not paragraph formatted", () => {
    expect(E.isParagraphFormattedText("This is a line of text.")).toBeFalsy();
  });

  test("Two lines separated by single line break are not paragraphs", () => {
    expect(E.isParagraphFormattedText("This is a line of text.\nHere is another line.")).toBeFalsy();
  });

  test("Two lines separated by double line break are paragraphs", () => {
    expect(
      E.isParagraphFormattedText("This is the first paragraph.\n\nThis is the second paragraph."),
    ).toBeTruthy();
  });

  test("Paragraphs are split at double line break", () => {
    expect(E.paragraphs("1 2 3\n\n4 5 6\n\n7 8 9")).toEqual(["1 2 3", "4 5 6", "7 8 9"]);
  });

  test("Can also use CRLF style line endings", () => {
    expect(E.paragraphs("1 2 3\r\n\r\n4 5 6\r\n\r\n7 8 9")).toEqual(["1 2 3", "4 5 6", "7 8 9"]);
  });

  test("Final line breaks don't make any difference for paragraphs", () => {
    expect(E.paragraphs("1 2 3\n\n4 5 6\n\n7 8 9\n")).toEqual(["1 2 3", "4 5 6", "7 8 9"]);
  });

  test("Paragraphs can be separated by extra line breaks", () => {
    expect(E.paragraphs("1 2 3\n\n4 5 6\n\n\n\n7 8 9\n\n")).toEqual(["1 2 3", "4 5 6", "7 8 9"]);
  });

  test("Line breaks are converted to spaces inside paragraphs", () => {
    expect(E.paragraphs("1 2 3\n4 5 6\n\n7 8 9")).toEqual(["1 2 3 4 5 6", "7 8 9"]);
    expect(E.paragraphs("1 2 3\r\n4 5 6\r\n\r\n7 8 9")).toEqual(["1 2 3 4 5 6", "7 8 9"]);
  });
});

describe("external link decorations", () => {
  test("when there are no external links in the text, there are no decorations", () => {
    expect(E.externalLinkRanges(["No external links here!"])).toEqual([]);
  });

  test("an external link inside a single text node is detected", () => {
    expect(E.externalLinkRanges(["Link to https://example.com should be detected!"])).toEqual([{from: 8, to: 27}]);
  });

  test("an external link after an internal link is detected", () => {
    expect(
      E.externalLinkRanges([
        "First, ",
        {link: "0", title: "an internal link"},
        ". And now: https://example.com should still be detected!",
      ]),
    ).toEqual([{from: 19, to: 38}]);
  });

  test("multiple links in the same text fragment are detected", () => {
    expect(E.externalLinkRanges(["First, https://example.com. And now https://another.example.com."])).toEqual([
      {from: 7, to: 26},
      {from: 36, to: 63},
    ]);
  });

  test("when a link is enclosed in parentheses, the closing parenthesis is not part of the link", () => {
    expect(E.externalLinkRanges(["An example (https://example.com) it is."])).toEqual([{from: 12, to: 31}]);
  });
});

describe("inserting a link while having some text selected", () => {
  const before: E.Editor = {
    content: ["This is just some text. How about that?"],
    selection: {from: 8, to: 22},
  };

  const after = E.insertLink(before, {link: "1234", title: "my very own link"});

  it("modifies the content to contain the link", () => {
    expect(after.content).toEqual(["This is ", {link: "1234", title: "my very own link"}, ". How about that?"]);
  });

  it("places the selection after the link", () => {
    expect(after.selection).toEqual({from: 9, to: 9});
  });
});

describe("when saving editor state into application", () => {
  const before = A.of({
    "1": {content: ["Item 1 before content was edited"]},
  });

  const editor: E.Editor = {
    content: ["This is a link: ", {link: "2", title: "Item 2"}, "."],
    selection: {from: 0, to: 0},
  };

  const after = E.save(before, editor, "1");
  const content = D.content(after.state, "1");

  test("the text segments are taken from the editor state", () => {
    expect(content[0]).toBe("This is a link: ");
    expect(content[2]).toBe(".");
  });

  test("the links mention only the IDs of each linked item from the editor state", () => {
    expect(content[1]).toEqual({link: "2"});
  });

  test("any segments not in the editor state are deleted", () => {
    expect(content.length).toBe(3);
  });
});

describe("an editor is created from the application state", () => {
  test("when initializing the application", () => {
    const app = A.of({
      "0": {content: ["Item 0"]},
    });

    expect(A.editor(app, T.root(app.tree))).toEqual({content: ["Item 0"], selection: {from: 0, to: 0}});
  });

  test("when adding a new item", () => {
    const before = A.of({
      "0": {content: ["Item 0"]},
    });

    let [state, tree, thing, node] = T.createChild(before.state, before.tree, T.root(before.tree));
    state = D.setContent(state, thing, ["New Item"]);
    const after = A.merge(before, {state, tree});

    expect(A.editor(before, node)).toBeNull();
    expect(A.editor(after, node)).toEqual({content: ["New Item"], selection: {from: 0, to: 0}});
  });

  test("when loading an existing item", () => {
    const before = A.of({
      "0": {content: ["Item 0"]},
    });

    let [state, tree, node] = T.insertChild(before.state, before.tree, T.root(before.tree), "0", 0);
    const after = A.merge(before, {state, tree});

    expect(A.editor(before, node)).toBeNull();
    expect(A.editor(after, node)).toEqual({content: ["Item 0"], selection: {from: 0, to: 0}});
  });

  test("links in the loaded editor are annotated with link title", () => {
    const app = A.of({
      "0": {content: ["Item 0 has link to ", {link: "1"}, "."]},
      "1": {content: ["Item 1"]},
    });

    expect(A.editor(app, T.root(app.tree))).toEqual({
      content: ["Item 0 has link to ", {link: "1", title: "Item 1"}, "."],
      selection: {from: 0, to: 0},
    });
  });
});

describe("when one item exists in multiple places", () => {
  const app = A.of({
    "0": {content: ["Root"], children: ["1", "1"]},
    "1": {content: ["Item 1"]},
  });

  const node1 = () => T.children(app.tree, T.root(app.tree))[0];
  const node2 = () => T.children(app.tree, T.root(app.tree))[1];

  test("both editors start out with the same content and an empty selection", () => {
    expect(A.editor(app, node1())).toEqual({content: ["Item 1"], selection: {from: 0, to: 0}});
    expect(A.editor(app, node2())).toEqual({content: ["Item 1"], selection: {from: 0, to: 0}});
  });

  describe("editing the item in one editor", () => {
    const after = A.edit(app, node1(), {content: ["Edited Item 1"], selection: {from: 13, to: 13}});

    it("directly updates that editor, including selection", () => {
      expect(A.editor(app, node1())).toEqual({content: ["Item 1"], selection: {from: 0, to: 0}});
      expect(A.editor(after, node1())).toEqual({content: ["Edited Item 1"], selection: {from: 13, to: 13}});
    });

    it("updates the content of the other item and resets the selection", () => {
      expect(A.editor(app, node2())).toEqual({content: ["Item 1"], selection: {from: 0, to: 0}});
      expect(A.editor(after, node2())).toEqual({content: ["Edited Item 1"], selection: {from: 0, to: 0}});
    });
  });

  describe("and then editing the item in the other editor", () => {
    const first = A.edit(app, node1(), {content: ["Edited Item 1"], selection: {from: 13, to: 13}});
    const second = A.edit(first, node2(), {content: ["Edited Item 1 again"], selection: {from: 19, to: 19}});

    it("directly updates that editor, including selection", () => {
      expect(A.editor(first, node2())).toEqual({content: ["Edited Item 1"], selection: {from: 0, to: 0}});
      expect(A.editor(second, node2())).toEqual({content: ["Edited Item 1 again"], selection: {from: 19, to: 19}});
    });

    it("updates the content of the previous editor and resets the selection", () => {
      expect(A.editor(first, node1())).toEqual({content: ["Edited Item 1"], selection: {from: 13, to: 13}});
      expect(A.editor(second, node1())).toEqual({content: ["Edited Item 1 again"], selection: {from: 0, to: 0}});
    });
  });
});

test("editing the root and then jumping to a different item resets the root editor", () => {
  const initial = A.of({
    "0": {content: ["Item 0"]},
    "1": {content: ["Item 1"]},
  });

  const edited = A.edit(initial, T.root(initial.tree), {
    content: ["Edited Item 0"],
    selection: {from: 13, to: 13},
  });

  const jumped = A.jump(edited, "1");

  expect(A.editor(edited, T.root(edited.tree))).toEqual({
    content: ["Edited Item 0"],
    selection: {from: 13, to: 13},
  });
  expect(A.editor(jumped, T.root(jumped.tree))).toEqual({content: ["Item 1"], selection: {from: 0, to: 0}});
});
