import * as D from "./data";

export type EditorContent = (string | {link: string; title: string | null})[];
export type Range = {from: number; to: number};

export function collate(content: D.Content, state: D.State): EditorContent {
  return content.map((piece) => {
    if (typeof piece === "string") {
      return piece;
    } else {
      return {link: piece.link, title: D.exists(state, piece.link) ? D.contentText(state, piece.link) : null};
    }
  });
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
