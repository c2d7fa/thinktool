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

    const content = E.collate(D.content(state, "1"), state);

    expect(content).toEqual(["Item 1 has link to ", {link: "0", title: "Item 0"}, "."]);
  });
});
