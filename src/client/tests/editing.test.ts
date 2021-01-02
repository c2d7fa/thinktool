/// <reference types="@types/jest" />

import * as D from "../src/data";

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

describe("loading editor from application state", () => {
  it("annotates links with their content", () => {
    let state = D.empty;
    state = D.create(state, "1")[0];
    state = D.setContent(state, "0", ["Item 0"]);
    state = D.setContent(state, "1", ["Item 1 has link to ", {link: "0"}, "."]);

    const content = E.load(D.content(state, "1"), state).content;

    expect(content).toEqual(["Item 1 has link to ", {link: "0", title: "Item 0"}, "."]);
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

describe("when converting editor content to plain data content", () => {
  const editor: E.Editor = {
    content: ["This is a link: ", {link: "2", title: "Item 2"}, "."],
    selection: {from: 0, to: 0},
  };

  const content = E.produceContent(editor);

  test("the text segments are the same", () => {
    expect(content[0]).toBe("This is a link: ");
    expect(content[2]).toBe(".");
  });

  test("the links mention only the IDs of each linked item", () => {
    expect(content[1]).toEqual({link: "2"});
  });

  test("there aren't any other segments added", () => {
    expect(content.length).toBe(3);
  });
});
