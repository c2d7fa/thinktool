import * as React from "react";

import * as D from "../data";

import ThingSelectPopup from "./ThingSelectPopup";

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

function InternalLink(props: {
  getContentText(thing: string): string;
  openInternalLink(thing: string): void;
  isLinkOpen(thing: string): boolean;
  thing: string;
}) {
  const content = props.getContentText(props.thing);
  return (
    <a
      className={`internal-link${props.isLinkOpen(props.thing) ? " internal-link-open" : ""}`}
      href="#"
      onClick={(ev) => {
        props.openInternalLink(props.thing);
        ev.preventDefault();
      }}
    >
      {content === "" ? <span className="empty-content">#{props.thing}</span> : content}
    </a>
  );
}

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
  let fragments: React.ReactNode[] = [];

  let i = 0; // Node key
  for (const range of annotate(props.text)) {
    const text = props.text.substring(range.start, range.end);

    if (!range.annotation) {
      fragments.push(text);
    } else if ("internalLink" in range.annotation) {
      fragments.push(
        <InternalLink
          key={i++}
          thing={range.annotation.internalLink}
          getContentText={props.getContentText}
          openInternalLink={props.openInternalLink ?? (() => {})}
          isLinkOpen={props.isLinkOpen ?? (() => false)}
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
          props.onFocus && props.onFocus(ev);
        }
      }}
      className={`editor-inactive ${props.className}`}
    >
      {fragments}
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
