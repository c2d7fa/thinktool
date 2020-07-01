import * as React from "react";

import * as D from "../data";
import * as T from "../tree";
import * as E from "../editing";
import {Context} from "../context";

import BaseExternalLink from "./ExternalLink"; // Silly naming conflict

function annotate(content: D.Content): (string | {externalLink: string} | {link: string})[] {
  function annotateText(text: string): (string | {externalLink: string})[] {
    let result: (string | {externalLink: string})[] = [];

    let position = 0;

    function commitText(end: number) {
      if (position !== end) {
        result.push(text.substring(position, end));
        position = end;
      }
    }

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

      commitText(start);
      result = [...result, {externalLink: text.substring(start, end)}];
      position = end;
    }

    commitText(text.length);

    return result;
  }

  let result: (string | {externalLink: string} | {link: string})[] = [];
  for (const segment of content) {
    if (typeof segment === "string") {
      result = [...result, ...annotateText(segment)];
    } else {
      result = [...result, segment];
    }
  }
  return result;
}

function ExternalLink(props: {link: string}) {
  return (
    <BaseExternalLink className="plain-text-link" href={props.link}>
      {props.link}
    </BaseExternalLink>
  );
}

function InternalLink(props: {context: Context; node: T.NodeRef; link: string}) {
  const content = D.contentText(props.context.state, props.link);

  const expanded = T.isLinkOpen(props.context.tree, props.node, props.link);
  const terminal =
    !D.hasChildren(props.context.state, props.link) &&
    D.otherParents(props.context.state, props.link).length === 0;

  return (
    <span
      className={`internal-link${
        T.isLinkOpen(props.context.tree, props.node, props.link) ? " internal-link-open" : ""
      }`}>
      <span
        className={`link-bullet ${terminal ? "terminal" : expanded ? "expanded" : "collapsed"}`}
        onMouseDown={(ev) => {
          ev.preventDefault();
        }}
        onClick={(ev) => {
          props.context.setTree(
            T.toggleLink(props.context.state, props.context.tree, props.node, props.link),
          );
          ev.preventDefault();
        }}></span>
      <span className="link-content">
        {content === "" ? <span className="empty-content">{props.link}</span> : content}
      </span>
    </span>
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

  const content = D.content(props.context.state, T.thing(props.context.tree, props.node));

  let i = 0; // Node key
  for (const segment of annotate(content)) {
    if (typeof segment === "string") {
      fragments.push(segment);
    } else if ("link" in segment) {
      fragments.push(
        <InternalLink key={i++} link={segment.link} node={props.node} context={props.context} />,
      );
    } else if ("externalLink" in segment) {
      fragments.push(<ExternalLink key={i++} link={segment.externalLink} />);
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

  const [editing, setEditing_] = React.useState<string>(
    E.contentToEditString(D.content(props.context.state, T.thing(props.context.tree, props.node))),
  );
  function setEditing(editing: string) {
    setEditing_(editing);
    props.context.setState(
      D.setContent(
        props.context.state,
        T.thing(props.context.tree, props.node),
        E.contentFromEditString(editing),
      ),
    );
  }

  React.useEffect(() => {
    if (
      E.contentToEditString(D.content(props.context.state, T.thing(props.context.tree, props.node))) !==
      editing
    ) {
      setEditing_(
        E.contentToEditString(D.content(props.context.state, T.thing(props.context.tree, props.node))),
      );
    }
  }, [props.context.state]);

  // Automatically resize textarea to fit content.
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0"; // Necessary for shrinking
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [editing]);

  return (
    <div className={`editor ${props.className}`}>
      <textarea
        ref={textareaRef}
        value={editing}
        onChange={(ev) => setEditing(ev.target.value)}
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
