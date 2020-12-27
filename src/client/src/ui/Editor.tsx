import * as React from "react";
import * as ReactDOM from "react-dom";

import * as PS from "prosemirror-state";
import * as PV from "prosemirror-view";
import * as PM from "prosemirror-model";
import ProseMirror from "./ProseMirror";

import * as D from "../data";
import * as T from "../tree";
import * as E from "../editing";
import * as Sh from "../shortcuts";
import * as Ac from "../actions";
import {AppState, merge} from "../context";

import Bullet from "./Bullet";

// Sometimes we want to pass a callback to some function that doesn't know about
// React, but which should still have access to the latest value of a prop
// passed to a component.
//
// This function lets us make the latest value of a prop available as a ref,
// which we can then dereference from inside such a callback.
//
// We use this when integrating with ProseMirror.
function usePropRef<T>(prop: T): React.RefObject<T> {
  const ref = React.useRef(prop);
  React.useEffect(() => {
    ref.current = prop;
  }, [prop]);
  return ref;
}

function findExternalLinks(textContent: string): {from: number; to: number}[] {
  let results: {from: number; to: number}[] = [];

  const linkRegex = /https?:\/\S*/g;

  for (const match of [...textContent.matchAll(linkRegex)]) {
    if (match.index === undefined) throw "bad programmer error";

    const start = match.index;
    let end = match.index + match[0].length;

    // Trim punctuation at the end of link:
    if ([",", ".", ":", ")", "]"].includes(textContent[end - 1])) {
      end -= 1;
    }

    results.push({from: start, to: end});
  }

  return results;
}

function buildInternalLink(args: {
  jump(): void;
  toggle(): void;
  content: {invalid: string} | string;
}): HTMLElement {
  const container = document.createElement("span");

  // [TODO] This is an abuse of React. We never clean anything up. We should
  // probably create this element manually, although that would also require us
  // to do the same for <Bullet>, which is unfortunate.

  ReactDOM.render(
    <span
      className="internal-link"
      onMouseDown={(ev) => {
        ev.preventDefault();
      }}
      onAuxClick={(ev) => {
        const isMiddleClick = ev.button === 1;
        if (isMiddleClick) {
          args.jump();
        }
      }}
      onClick={(ev) => {
        if (ev.shiftKey) args.jump();
        else args.toggle();
      }}
    >
      <Bullet
        specialType="link"
        status="collapsed"
        toggle={args.toggle}
        beginDrag={(ev) => {
          // [TODO] This is undefined on mobile. This may or may not cause issues; I haven't tested it.
          if (ev !== undefined) ev.preventDefault();
        }}
      />
      &nbsp;
      <span className="link-content">
        {typeof args.content === "string" ? (
          args.content
        ) : (
          <span className="invalid-link-id">{args.content.invalid}</span>
        )}
      </span>
    </span>,
    container,
  );

  return container;
}

type LinkAttrs = {
  content: string | null;
  jump: () => void;
  target: string;
  toggle: () => void;
};

const schema = new PM.Schema({
  nodes: {
    doc: {content: "(text | link)*"},
    link: {
      attrs: {target: {}, jump: {}, toggle: {}, content: {}},
      inline: true,
      atom: true,
      selectable: false,
      toDOM(node) {
        const attrs = node.attrs as LinkAttrs;
        return buildInternalLink({
          jump: attrs.jump,
          toggle: attrs.toggle,
          content: attrs.content ? attrs.content : {invalid: attrs.target},
        });
      },
    },
    text: {},
  },
});

function createExternalLinkDecorationPlugin(args: {openExternalUrl(url: string): void}): PS.Plugin<typeof schema> {
  // We need custom handlers for some events related to links to get the
  // behavior we want. Sadly, ProseMirror does not let us bind event
  // handlers to decorations. Instead, we have to bind strings to these
  // attributes, and then register global event handlers.
  (window as any).hackilyHandleExternalLinkMouseDown = (ev: MouseEvent) => {
    if (!ev.altKey) {
      const a = ev.target as HTMLAnchorElement;
      args.openExternalUrl(a.textContent!);
      ev.preventDefault();
    }
  };

  return new PS.Plugin({
    props: {
      decorations(state: PS.EditorState<PM.Schema>) {
        let ranges: {from: number; to: number}[] = [];
        state.doc.content.forEach((node, offset) => {
          ranges = ranges.concat(
            findExternalLinks(node.textContent).map((range) => ({
              from: offset + range.from,
              to: offset + range.to,
            })),
          );
        });

        return PV.DecorationSet.create(
          state.doc,
          ranges.map((range) =>
            PV.Decoration.inline(range.from, range.to, {
              class: "plain-text-link",
              nodeName: "a",
              href: "#",
              style: "cursor: pointer;",
              onmousedown: "hackilyHandleExternalLinkMouseDown(event)",
            }),
          ),
        );
      },
    },
  });
}

function toProseMirror(
  content: E.EditorContent,
  args: {
    openLink: (link: string) => void;
    jumpLink: (link: string) => void;
  },
): PM.Node<typeof schema> {
  const nodes = [];

  for (const contentNode of content) {
    if (typeof contentNode === "string") {
      if (contentNode === "") {
        // Empty text nodes are not allowed by ProseMirror.
        continue;
      }
      nodes.push(schema.text(contentNode));
    } else if (contentNode.link !== undefined) {
      // We store the 'onclick' callback on each node. Perhaps it would make
      // more sense to only pass in the target here, and construct that callback
      // in the 'toDOM' method. But that would require the schema to have access
      // to the application state, which also feels weird.
      const attrs: LinkAttrs = {
        target: contentNode.link,
        toggle: () => args.openLink(contentNode.link),
        jump: () => args.jumpLink(contentNode.link),
        content: contentNode.title,
      };
      nodes.push(schema.node("link", attrs));
    }
  }

  return schema.node("doc", {}, nodes);
}

function fromProseMirror(doc: PM.Node<typeof schema>): E.EditorContent {
  const content: E.EditorContent = [];

  doc.forEach((node) => {
    if (node.isText) {
      content.push(node.textContent);
    } else if (node.type.name === "link") {
      content.push({link: node.attrs.target, title: node.attrs.content});
    }
  });

  return content;
}

function contentEq(a: E.EditorContent, b: E.EditorContent): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; ++i) {
    if (typeof a[i] === "string" && a[i] !== b[i]) return false;
    if (
      typeof a[i] !== "string" &&
      (typeof b[i] === "string" ||
        a[i].link !== b[i].link ||
        (a[i] as {link: string; title: string}).title !== (b[i] as {link: string; title: string}).title)
    )
      return false;
  }

  return true;
}

export function onPastedParagraphs(app: AppState, node: T.NodeRef, paragraphs: string[]) {
  let [state, tree] = [app.state, app.tree];
  let lastNode = node;

  for (const paragraph of paragraphs) {
    const [state_, tree_, thing, lastNode_] = T.createSiblingAfter(state, tree, lastNode);
    [state, tree, lastNode] = [state_, tree_, lastNode_];

    state = D.setContent(state, thing, [paragraph]);
  }

  return merge(app, {state, tree});
}

export interface EditorState {
  selection: string;
  replace(link: string, textContent: string): void;
}

export function Editor(props: {
  content: E.EditorContent;
  hasFocus: boolean;
  onAction(action: Ac.ActionName): void;
  onOpenLink(target: string): void;
  onJumpLink(target: string): void;
  onFocus(): void;
  onEdit(content: D.Content): void;
  onPastedParagraphs(paragraphs: string[]): void;
  onEditorStateChanged(editorState: EditorState): void;
  onOpenExternalUrl(url: string): void;
}) {
  const onOpenLinkRef = usePropRef(props.onOpenLink);
  const onJumpLinkRef = usePropRef(props.onJumpLink);
  const onActionRef = usePropRef(props.onAction);
  const onFocusRef = usePropRef(props.onFocus);
  const onPastedParagraphsRef = usePropRef(props.onPastedParagraphs);
  const onEditorStateChangedRef = usePropRef(props.onEditorStateChanged);
  const onOpenExternalUrlRef = usePropRef(props.onOpenExternalUrl);

  const keyPlugin = new PS.Plugin({
    props: {
      handleKeyDown(view, ev) {
        let conditions: Sh.Condition[] = [];
        if (view.endOfTextblock("backward")) conditions.push("first-character");
        if (view.endOfTextblock("forward")) conditions.push("last-character");
        if (view.endOfTextblock("up")) conditions.push("first-line");
        if (view.endOfTextblock("down")) conditions.push("last-line");

        for (const action of Ac.allActionsWithShortcuts) {
          if (Sh.matches(ev, Ac.shortcut(action), conditions)) {
            onActionRef.current!(action);
            return true;
          }
        }

        if (ev.key === "Backspace" && view.state.doc.childCount === 0) {
          console.log("Destroying item due to backspace on empty item.");
          onActionRef.current!("destroy");
        }

        // We don't want to handle anything by default.
        return false;
      },
    },
  });

  const externalLinkDecorationPlugin = createExternalLinkDecorationPlugin({
    openExternalUrl(url: string) {
      onOpenExternalUrlRef.current!(url);
    },
  });

  const pastePlugin = new PS.Plugin({
    props: {
      handlePaste(view, ev, slice) {
        const text = ev.clipboardData?.getData("text/plain");

        if (text !== undefined && E.isParagraphFormattedText(text)) {
          onPastedParagraphsRef.current!(E.paragraphs(text));
          return true;
        }

        return false;
      },
    },
  });

  // When the user clicks on this editor to focus it, we want to communicate
  // that back to the state managed by React. This plugin handles that.
  const focusPlugin = new PS.Plugin({
    props: {
      handleClick(view, pos, ev) {
        onFocusRef.current!();
        return false;
      },
    },
  });

  function recreateEditorState() {
    return PS.EditorState.create({
      schema,
      doc: toProseMirror(props.content, {
        openLink: (thing) => onOpenLinkRef.current!(thing),
        jumpLink: (thing) => onJumpLinkRef.current!(thing),
      }),
      plugins: [keyPlugin, pastePlugin, externalLinkDecorationPlugin, focusPlugin],
    });
  }

  const [editorState, setEditorState] = React.useState(recreateEditorState());

  function onTransaction(transaction: PS.Transaction<typeof schema>, view: PV.EditorView<typeof schema>) {
    setEditorState(editorState.apply(transaction));
  }

  React.useEffect(() => {
    // Avoid infinite loop:
    if (!props.hasFocus) return;
    if (contentEq(props.content, fromProseMirror(editorState.doc))) return;

    props.onEdit(fromProseMirror(editorState.doc));
  }, [props.onEdit, editorState]);

  React.useEffect(() => {
    // The popup that appears e.g. when inserting a link needs to have access
    // to the current selection.
    const textSelection = (() => {
      let content: D.Content = [];
      editorState.selection.content().content.forEach((node) => {
        if (node.isText) {
          content.push(node.textContent);
        } else if (node.type.name === "link") {
          content.push({link: node.attrs.target});
        }
      });
      return E.contentToEditString(content);
    })();

    onEditorStateChangedRef.current!({
      selection: textSelection,

      replace(link: string, textContent: string): void {
        const tr = editorState.tr;
        const attrs: LinkAttrs = {
          target: link,
          toggle: () => onOpenLinkRef.current!(link),
          jump: () => onJumpLinkRef.current!(link),
          content: textContent,
        };
        tr.replaceSelectionWith(schema.node("link", attrs));

        setEditorState(editorState.apply(tr));
      },
    });
  }, [editorState]);

  // When our content gets updated via our props, we want to reflect those
  // updates in the editor state.
  React.useEffect(() => {
    // Avoid infinite loop:
    if (props.hasFocus) return;
    if (contentEq(props.content, fromProseMirror(editorState.doc))) return;

    setEditorState(recreateEditorState());
  }, [props.hasFocus, editorState, props.content]);

  return <ProseMirror state={editorState} onTransaction={onTransaction} hasFocus={props.hasFocus} />;
}
