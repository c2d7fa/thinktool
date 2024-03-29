/// <reference types="@types/jest" />

import * as E from "./editor";

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

describe("reading selection from editor", () => {
  it("when there aren't any links gives the selected text", () => {
    const editor = {content: ["This is some text inside an editor."], selection: {from: 8, to: 17}};
    expect(E.selectedText(editor)).toBe("some text");
  });

  it("replaces links with their titles", () => {
    const editor = {
      content: ["This is a ", {link: "1", title: "Link"}, " inside an editor."],
      selection: {from: 8, to: 18},
    };
    expect(E.selectedText(editor)).toBe("a Link inside");
  });
});
