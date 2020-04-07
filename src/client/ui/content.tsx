import * as React from "react";

import * as D from "../data";

import ThingSelectPopup from "./ThingSelectPopup";

/*
function decorate([node, path]: [Slate.Node, Slate.Path]): Slate.Range[] {
  // TODO: I don't understand what the point of this is, but if we don't add it,
  // Slate makes empty copies of the decorators. Taken from
  // https://github.com/ianstormtaylor/slate/blob/master/site/examples/markdown-preview.js.
  if (!Slate.Text.isText(node)) return [];

  const text = Slate.Node.string(node);

  let ranges: Slate.Range[] = [];

  // External links*/

//const linkRegex = /https?:\/\S*/g;
/*
  for (const match of [...text.matchAll(linkRegex)]) {
    if (match.index === undefined) throw "bad programmer error";

    const start = match.index;
    let end = match.index + match[0].length;

    // Trim punctuation at the end of link:
    if ([",", ".", ":", ")", "]"].includes(text[end - 1])) {
      end -= 1;
    }

    ranges = [
      ...ranges,
      {anchor: {path, offset: start}, focus: {path, offset: end}, link: text.slice(start, end)},
    ];
  }

  return ranges;
}

function renderLeaf(props: SlateReact.RenderLeafProps) {
  if (props.leaf.link) {
    // Since the link is inside an element with contenteditable="true" and does
    // not itself have contenteditable="false", it cannot be clicked, so we need
    // to add some special UI to allow the link to be clicked.
    //
    // TODO: It would be nice if it were possible to click the link when the
    // item is not being edited, but I'm not sure how to implement this. Setting
    // readOnly on the editor should do the job, but how do we detect when the
    // user is actively editing the item?
    //
    // Anyway, we just let the user open the link by middle clicking on it.
    // That's good enough for now.

    const clickProps = {
      onAuxClick: (ev: React.MouseEvent) => {
        // Middle click
        if (ev.button === 1) {
          window.open(props.leaf.link);
          ev.preventDefault();
        }
      },
      title: `${props.leaf.link}\n(Open with middle click)`,
    };

    return (
      <a className="plain-text-link" href={props.leaf.link} {...clickProps} {...props.attributes}>
        {props.children}
      </a>
    );
  } else {
    return <SlateReact.DefaultLeaf {...props} />;
  }
}

function renderElement(
  props: SlateReact.RenderElementProps & {
    getContentText(thing: string): string;
    openInternalLink(thing: string): void;
    isLinkOpen(thing: string): boolean;
  },
) {
  if (props.element.type === "internalLink") {
    const content = props.getContentText(props.element.internalLink);
    return (
      <a
        className={`internal-link${
          props.isLinkOpen(props.element.internalLink) ? " internal-link-open" : ""
        }`}
        href="#"
        onClick={(ev) => {
          props.openInternalLink(props.element.internalLink);
          ev.preventDefault();
        }}
        {...props.attributes}
        contentEditable={false}
      >
        {content === "" ? <span className="empty-content">#{props.element.internalLink}</span> : content}
        {props.children}
      </a>
    );
  } else {
    return <SlateReact.DefaultElement {...props} />;
  }
}

// We store nodes as text like this: "Text text text #abcdefgh text text\nMore
// text." That is, internal linkes are stored like "#<THING NAME>", and
// paragraphs are separated by a newline.

function nodesFromText(text: string): Slate.Node[] {
  let nodes: Slate.Node[] = [];

  const segments = text.split(/(#[a-z0-9]+)/g);

  for (const segment of segments) {
    const match = segment.match(/#([a-z0-9]+)/);
    if (match && match[0] === segment) {
      nodes = [...nodes, {type: "internalLink", internalLink: match[1], children: [{text: ""}]}];
    } else {
      nodes = [...nodes, {text: segment}];
    }
  }

  return [{type: "paragraph", children: nodes}];
}

function nodesToText(nodes: Slate.Node[]): string {
  let result = "";

  function addNodes(nodes: Slate.Node[]) {
    for (const node of nodes) {
      if (node.type === "paragraph") {
        if (node === nodes[0]) {
          addNodes(node.children);
        } else {
          result += "\n";
          addNodes(node.children);
        }
      } else if (node.type === "internalLink") {
        result += "#" + node.internalLink;
      } else {
        result += Slate.Node.string(node);
      }
    }
  }

  addNodes(nodes);

  return result;
}

*/

function RenderedContent(props: {
  things: D.State;
  focused?: boolean;
  text: string;
  setText(text: string): void;
  className?: string;
  onFocus?(ev: React.FocusEvent<{}>): void;
  onKeyDown?(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean;
  placeholder?: string;
  getContentText(thing: string): string;
  openInternalLink?(thing: string): void;
  isLinkOpen?(thing: string): boolean;
}) {
  return (
    <div tabIndex={-1} onFocus={props.onFocus} className={`editor-inactive ${props.className}`}>
      {props.text}
    </div>
  );
}

export function ContentEditor(props: {
  things: D.State;
  focused?: boolean;
  text: string;
  setText(text: string): void;
  className?: string;
  onFocus?(ev: React.FocusEvent<{}>): void;
  onBlur?(): void;
  onKeyDown?(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean;
  placeholder?: string;
  getContentText(thing: string): string;
  openInternalLink?(thing: string): void;
  isLinkOpen?(thing: string): boolean;
}) {
  const [showLinkPopup, setShowLinkPopup] = React.useState(false);

  const preservedSelectionRef = React.useRef<[number, number] | null>(null);

  React.useEffect(() => {
    if (props.focused) textareaRef.current?.focus();
  }, [props.focused]);

  function onKeyDown(ev: React.KeyboardEvent): void {
    // When the user presses up on the first line or down on the last line, we
    // want to let the parent handle the event. Unfortunately, there is not
    // easy way to check which line the cursor is on, so we must use a hack
    // here.
    //
    // We choose to *always* the the standard cursor movement event fire, but
    // once the cursor has been moved, we check to see if it is in the first
    // character (which will be true if it was moved up from the first line),
    // or on the last character (which will happen if it was moved  down from
    // the last line).
    //
    // This breaks if the user presses up on the first column of the second
    // line, or if they press down on the last column of the penultimate line.
    // We don't handle that case.
    if ((ev.key === "ArrowUp" || ev.key === "ArrowDown") && !(ev.ctrlKey || ev.altKey)) {
      // Only handle event after cursor has been moved.
      if (props.onKeyDown !== undefined) {
        ev.persist(); // So they can access ev after timeout.
        setTimeout(() => {
          if (textareaRef.current?.selectionStart === 0) {
            props.onKeyDown!(ev, {startOfItem: true, endOfItem: false});
          } else if (textareaRef.current?.selectionEnd === textareaRef.current?.value.length) {
            props.onKeyDown!(ev, {startOfItem: false, endOfItem: true});
          }
        });
      }
      return;
    }

    if (ev.key === "l" && ev.altKey) {
      if (textareaRef.current === null) return;

      // Preserve selection so it can be restored when we insert the link.
      preservedSelectionRef.current = [textareaRef.current.selectionStart, textareaRef.current.selectionEnd];
      setShowLinkPopup(true);
      return ev.preventDefault();
    }

    if (props.onKeyDown !== undefined && props.onKeyDown(ev, {startOfItem: false, endOfItem: false})) {
      // The event was handled by our parent.
      ev.preventDefault();
    }
  }

  const linkPopup = (() => {
    if (!showLinkPopup) return null;

    return (
      <ThingSelectPopup
        state={props.things}
        hide={() => setShowLinkPopup(false)}
        submit={(link: string) => {
          if (textareaRef.current === null) {
            console.error("Can't get textarea; exiting early.");
            return;
          }

          if (preservedSelectionRef.current === null) {
            console.error("No selection preserved; exiting early.");
            return;
          }
          textareaRef.current.selectionStart = preservedSelectionRef.current[0];
          textareaRef.current.selectionEnd = preservedSelectionRef.current[1];

          props.setText(
            props.text.substring(0, textareaRef.current.selectionStart) +
              link +
              props.text.substring(textareaRef.current.selectionEnd),
          );
        }}
      />
    );
  })();

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Automatically resize textarea to fit content.
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0"; // Necessary for shrinking
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [props.text]);

  return (
    <div className={`editor ${props.className}`}>
      <textarea
        ref={textareaRef}
        value={props.text}
        onChange={(ev) => props.setText(ev.target.value)}
        onFocus={(ev) => props.onFocus !== undefined && props.onFocus(ev)}
        onBlur={props.onBlur}
        onKeyDown={onKeyDown}
      />
      {linkPopup}
    </div>
  );
}

export function Content(props: {
  things: D.State;
  focused?: boolean;
  text: string;
  setText(text: string): void;
  className?: string;
  onFocus?(ev: React.FocusEvent<{}>): void;
  onBlur?(): void;
  onKeyDown?(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean;
  placeholder?: string;
  getContentText(thing: string): string;
  openInternalLink?(thing: string): void;
  isLinkOpen?(thing: string): boolean;
}) {
  if (props.focused) {
    return <ContentEditor {...props} />;
  } else {
    return <RenderedContent {...props} />;
  }
}
