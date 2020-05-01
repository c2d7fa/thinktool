import * as React from "react";

import * as D from "../data";
import * as T from "../tree";
import {Context} from "../context";

type Annotation = {externalLink: string} | {internalLink: string};
type Range = {start: number; end: number; annotation?: Annotation};

function annotate(text: string): Range[] {
  let ranges: Range[] = [];

  // External links

  const linkRegex = /https?:\/\S*/g;

  for (const match of [...text.matchAll(linkRegex)]) {
    if (match.index === undefined) throw "bad programmer error";

    const start = match.index;
    let end = match.index + match[0].length;

    // Trim punctuation at the end of link:
    if ([",", ".", ":", ")", "]"].includes(text[end - 1])) {
      end -= 1;
    }

    ranges = [...ranges, {start, end, annotation: {externalLink: text.slice(start, end)}}];
  }

  // Internal links

  const internalLinkRegex = /#([a-z0-9]+)/g;

  for (const match of [...text.matchAll(internalLinkRegex)]) {
    if (match.index === undefined) throw "bad programmer error";

    const start = match.index;
    let end = match.index + match[0].length;

    ranges = [...ranges, {start, end, annotation: {internalLink: text.slice(start + 1, end)}}];
  }

  // Fill out missing ranges with text and sort them

  ranges.sort((a, b) => a.start - b.start);

  let fullRanges = [];

  let i = 0;
  for (const range of ranges) {
    if (i !== range.start) fullRanges.push({start: i, end: range.start});
    fullRanges.push(range);
    i = range.end;
  }
  if (i !== text.length) fullRanges.push({start: i, end: text.length});

  return fullRanges;
}

function ExternalLink(props: {link: string}) {
  return (
    <a className="plain-text-link" href={props.link}>
      {props.link}
    </a>
  );
}

function InternalLink(props: {context: Context; node: T.NodeRef; link: string}) {
  const content = D.contentText(props.context.state, props.link);
  return (
    <a
      className={`internal-link${
        T.isLinkOpen(props.context.tree, props.node, props.link) ? " internal-link-open" : ""
      }`}
      href="#"
      onClick={(ev) => {
        props.context.setTree(T.toggleLink(props.context.state, props.context.tree, props.node, props.link));
        ev.preventDefault();
      }}>
      {content === "" ? <span className="empty-content">#{props.link}</span> : content}
    </a>
  );
}

function RenderedContent(props: {
  context: Context;
  node: T.NodeRef;
  className?: string;
  onKeyDown?(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean;
  placeholder?: string;
}) {
  let fragments: React.ReactNode[] = [];

  const text = D.content(props.context.state, T.thing(props.context.tree, props.node));

  let i = 0; // Node key
  for (const range of annotate(text)) {
    const rangeText = text.substring(range.start, range.end);

    if (!range.annotation) {
      fragments.push(rangeText);
    } else if ("internalLink" in range.annotation) {
      fragments.push(
        <InternalLink
          key={i++}
          link={range.annotation.internalLink}
          node={props.node}
          context={props.context}
        />,
      );
    } else if ("externalLink" in range.annotation) {
      fragments.push(<ExternalLink key={i++} link={range.annotation.externalLink} />);
    }
  }

  const divRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={divRef}
      tabIndex={-1}
      onFocus={(ev) => {
        // Don't take focus when target of event was a child such as an
        // external link.
        if (ev.target === divRef.current) {
          props.context.setTree(T.focus(props.context.tree, props.node));
        }
      }}
      className={`editor-inactive ${props.className}`}>
      {fragments.length === 0 ? <span className="placeholder-empty">(Empty)</span> : <span>{fragments}</span>}
    </div>
  );
}

export function ContentEditor(props: {
  context: Context;
  node: T.NodeRef;
  className?: string;
  onKeyDown?(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean;
  placeholder?: string;
  setForceEditor(forceEditor: boolean): void;
}) {
  React.useEffect(() => {
    if (T.hasFocus(props.context.tree, props.node)) textareaRef.current?.focus();
  }, [props.context.tree]);

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

    const startOfItem = textareaRef.current?.selectionStart === 0;
    const endOfItem = textareaRef.current?.selectionEnd === textareaRef.current?.value.length;

    if (props.onKeyDown !== undefined && props.onKeyDown(ev, {startOfItem, endOfItem})) {
      // The event was handled by our parent.
      ev.preventDefault();
    }
  }

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const [text, setText_] = React.useState<string>(
    D.content(props.context.state, T.thing(props.context.tree, props.node)),
  );
  function setText(text: string) {
    setText_(text);
    props.context.setState(D.setContent(props.context.state, T.thing(props.context.tree, props.node), text));
  }

  React.useEffect(() => {
    if (D.content(props.context.state, T.thing(props.context.tree, props.node)) !== text) {
      setText_(D.content(props.context.state, T.thing(props.context.tree, props.node)));
    }
  }, [props.context.state]);

  // Automatically resize textarea to fit content.
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0"; // Necessary for shrinking
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  return (
    <div className={`editor ${props.className}`}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(ev) => setText(ev.target.value)}
        onFocus={(ev) => props.context.setTree(T.focus(props.context.tree, props.node))}
        onSelect={(ev) => {
          const start = textareaRef.current?.selectionStart;
          const end = textareaRef.current?.selectionEnd;
          if (start !== undefined && end !== undefined)
            props.context.setSelectionInFocusedContent({start, end});
        }}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

export function Content(props: {
  context: Context;
  node: T.NodeRef;
  className?: string;
  onKeyDown?(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean;
  placeholder?: string;
}) {
  const [forceEditor, setForceEditor] = React.useState<boolean>(false);

  if (T.hasFocus(props.context.tree, props.node) || forceEditor) {
    return <ContentEditor {...props} setForceEditor={setForceEditor} />;
  } else {
    return <RenderedContent {...props} />;
  }
}
