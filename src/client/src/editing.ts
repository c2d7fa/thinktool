import * as D from "./data";

export function contentToEditString(content: D.Content): string {
  let result = "";
  for (const segment of content) {
    if (typeof segment === "string") result += segment;
    else result += `#${segment.link}`;
  }
  return result;
}

export type EditorContent = (string | {link: string; title: string | null})[];

export function collate(content: D.Content, state: D.State): EditorContent {
  return content.map((piece) => {
    if (typeof piece === "string") {
      return piece;
    } else {
      return {link: piece.link, title: D.exists(state, piece.link) ? D.contentText(state, piece.link) : null};
    }
  });
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
