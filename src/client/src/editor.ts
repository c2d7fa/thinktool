import * as D from "./data";
import * as A from "./app";
import * as T from "./tree";
import * as Ac from "./actions";

export interface Editor {
  content: EditorContent;
  selection: Range;
}

export type EditorContent = ContentElement[];
export type ContentElement = string | {link: string; title: string | null};
export type Range = {from: number; to: number};

export function editorEq(a: Editor, b: Editor): boolean {
  return (
    a.selection.from === b.selection.from &&
    a.selection.to === b.selection.to &&
    JSON.stringify(a.content) === JSON.stringify(b.content)
  );
}

export function isEmpty(editor: Editor): boolean {
  return editorEq(editor, {selection: {from: 0, to: 0}, content: []});
}

export function loadContent(state: D.State, thing: string): EditorContent {
  const content = D.content(state, thing);
  return content.map((piece) => {
    if (typeof piece === "string") {
      return piece;
    } else {
      return {link: piece.link, title: D.exists(state, piece.link) ? D.contentText(state, piece.link) : null};
    }
  });
}

export function load(app: A.App, node: T.NodeRef): Editor {
  return {
    content: loadContent(app.state, T.thing(app.tree, node)),
    selection: {from: 0, to: 0},
  };
}

export function save(app: A.App, editor: Editor, thing: string): A.App {
  return A.merge(app, {
    state: D.setContent(
      app.state,
      thing,
      editor.content.map((segment) => {
        if (typeof segment === "string") {
          return segment;
        } else {
          return {link: segment.link};
        }
      }),
    ),
  });
}

function normalizeSelection(editor: Editor): {from: number; to: number} {
  return editor.selection.from <= editor.selection.to
    ? editor.selection
    : {from: editor.selection.to, to: editor.selection.from};
}

export function selectedText(editor: Editor): string {
  let positionalElements: ContentElement[] = [];
  for (const element of editor.content) {
    if (typeof element === "string") {
      positionalElements.push(...element);
    } else {
      positionalElements.push(element);
    }
  }
  const {from, to} = normalizeSelection(editor);
  const slice = positionalElements.slice(from, to);
  let result = "";
  for (const element of slice) {
    if (typeof element === "string") {
      result += element;
    } else {
      result += element.title;
    }
  }
  return result;
}

export function select(editor: Editor, selection: Range): Editor {
  return {...editor, selection};
}

export function placeSelectionAtEnd(editor: Editor): Editor {
  const innerLength = editor.content
    .map((element) => (typeof element === "string" ? element.length : 1))
    .reduce((a, b) => a + b);
  return select(editor, {from: innerLength, to: innerLength});
}

export function externalLinkRanges(content: EditorContent): Range[] {
  let indexedTexts: {index: number; text: string}[] = [];

  let index = 0;
  for (const element of content) {
    if (typeof element === "string") {
      indexedTexts.push({index, text: element});
      index += element.length;
    } else {
      index += 1;
    }
  }

  let ranges: {from: number; to: number}[] = [];

  for (const indexedText of indexedTexts) {
    for (const match of [...indexedText.text.matchAll(/https?:\/\S*/g)]) {
      if (match.index === undefined) {
        console.warn("An unexpected error occurred while parsing links. Ignoring.");
        continue;
      }

      const start = match.index;
      let end = match.index + match[0].length;

      // Trim punctuation at the end of link:
      if ([",", ".", ":", ")", "]"].includes(indexedText.text[end - 1])) {
        end -= 1;
      }

      ranges.push({from: indexedText.index + start, to: indexedText.index + end});
    }
  }

  return ranges;
}

export function insertLink(editor: Editor, link: {link: string; title: string}): Editor {
  let positionalElements: ContentElement[] = [];
  for (const element of editor.content) {
    if (typeof element === "string") {
      positionalElements.push(...element);
    } else {
      positionalElements.push(element);
    }
  }

  const {from, to} = normalizeSelection(editor);
  positionalElements.splice(from, to - from, link);

  let content: EditorContent = [];

  let current: string | null = null;
  for (const element of positionalElements) {
    if (typeof element !== "string") {
      if (current !== null) {
        content.push(current);
        current = null;
      }
      content.push(element as {link: string; title: string});
    } else {
      if (current === null) {
        current = element;
      } else {
        current += element;
      }
    }
  }
  if (current !== null) content.push(current);

  const cursor = from + 1;

  return {content, selection: {from: cursor, to: cursor}};
}

// #region Paragraphs

// When the user pastes a series of paragraph, the application should split each
// paragraph off into its own item. The functions `isParagraphFormattedText` and
// `paragraphs` implement the logic behind this behavior.
//
// By paragraph formatted text, we understand text that is split into paragraphs
// separted by (at least) two line breaks.

export function isParagraphFormattedText(text: string): boolean {
  return text.includes("\n\n") || text.includes("\r\n\r\n");
}

export function paragraphs(text: string): string[] {
  if (!isParagraphFormattedText(text)) {
    console.warn("Handling non-paragraph formatted text as though it were paragraph formatted.");
  }

  let input = text.trimEnd();
  let result: string[] = [];
  let resultParagraph: string | null = null;

  while (input.length > 0) {
    // Skip any paragraph breaks.
    if (input.substring(0, 1) === "\n") {
      input = input.substring(1);
      continue;
    } else if (input.substring(0, 2) === "\r\n") {
      input = input.substring(2);
      continue;
    }

    // Read paragraph, ignoring line breaks
    resultParagraph = "";
    while (input.length > 0 && !input.startsWith("\n\n") && !input.startsWith("\r\n\r\n")) {
      // Replace line breaks with spaces
      if (input.substring(0, 1) === "\n") {
        input = input.substring(1);
        resultParagraph += " ";
        continue;
      } else if (input.substring(0, 2) === "\r\n") {
        input = input.substring(2);
        resultParagraph += " ";
        continue;
      }

      resultParagraph += input.substring(0, 1);
      input = input.substring(1);
    }
    result.push(resultParagraph);
  }

  return result;
}

// #endregion

export type Event =
  | {type: "action"; action: Ac.ActionName}
  | {type: "open"; link: string}
  | {type: "jump"; link: string}
  | {type: "edit"; editor: Editor; focused: boolean}
  | {type: "paste"; paragraphs: string[]}
  | {type: "openUrl"; url: string};

export function pasteParagraphs(app: A.App, node: T.NodeRef, paragraphs: string[]): A.App {
  let [state, tree] = [app.state, app.tree];
  let lastNode = node;

  for (const paragraph of paragraphs) {
    const [state_, tree_, thing, lastNode_] = T.createSiblingAfter(state, tree, lastNode);
    [state, tree, lastNode] = [state_, tree_, lastNode_];

    state = D.setContent(state, thing, [paragraph]);
  }

  return A.merge(app, {state, tree});
}

export function forNode(app: A.App, node: T.NodeRef): {editor: Editor; hasFocus: boolean} {
  function require<T>(x: T | null): T {
    if (x === null) throw "unexpected null";
    return x;
  }

  return {
    editor: require(A.editor(app, node)),
    hasFocus: T.hasFocus(app.tree, node),
  };
}
