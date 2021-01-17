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
import {App, merge} from "../app";
import * as A from "../app";

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
        const ranges = E.externalLinkRanges(fromProseMirror(state).content);
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
  editor: E.Editor,
  args: {
    openLink: (link: string) => void;
    jumpLink: (link: string) => void;
    plugins: PS.Plugin<typeof schema>[];
  },
): PS.EditorState<typeof schema> {
  const nodes = [];

  for (const contentNode of editor.content) {
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

  const doc = schema.node("doc", {}, nodes);

  const selection = new PS.TextSelection(doc.resolve(editor.selection.from), doc.resolve(editor.selection.to));

  let result = PS.EditorState.create({
    schema,
    doc: doc,
    plugins: args.plugins,
    selection,
  });

  return result;
}

function fromProseMirror(proseMirrorEditorState: PS.EditorState<typeof schema>): E.Editor {
  const content: E.EditorContent = [];

  proseMirrorEditorState.doc.forEach((node) => {
    if (node.isText) {
      content.push(node.textContent);
    } else if (node.type.name === "link") {
      content.push({link: node.attrs.target, title: node.attrs.content});
    }
  });

  const selection = {from: proseMirrorEditorState.selection.anchor, to: proseMirrorEditorState.selection.head};

  return {content, selection};
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

export function onPastedParagraphs(app: App, node: T.NodeRef, paragraphs: string[]) {
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

export type Event =
  | {tag: "action"; action: Ac.ActionName}
  | {tag: "open"; link: string}
  | {tag: "jump"; link: string}
  | {tag: "focus"}
  | {tag: "edit"; editor: E.Editor}
  | {tag: "paste"; paragraphs: string[]}
  | {tag: "openUrl"; url: string};

// [TODO] This can only handle some cases. It can't handle actions, since that
// requires opening a popup and waiting for user input.
//
// [TODO] Add unit tests for this function.
export function handling(app: App, node: T.NodeRef) {
  return (ev: Event): {handled: boolean; app: App} => {
    if (ev.tag === "edit") {
      return {handled: true, app: A.edit(app, node, ev.editor)};
    } else if (ev.tag === "open") {
      return {handled: true, app: A.toggleLink(app, node, ev.link)};
    } else if (ev.tag === "jump") {
      return {handled: true, app: A.jump(app, ev.link)};
    } else if (ev.tag === "paste") {
      return {handled: true, app: onPastedParagraphs(app, node, ev.paragraphs)};
    } else if (ev.tag === "focus") {
      return {handled: true, app: A.merge(app, {tree: T.focus(app.tree, node)})};
    }

    return {handled: false, app};
  };
}

export function Editor(props: {editor: E.Editor; hasFocus: boolean; onEvent(event: Event): void}) {
  const onEventRef = usePropRef(props.onEvent);

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
            onEventRef.current!({tag: "action", action});
            return true;
          }
        }

        if (ev.key === "Backspace" && view.state.doc.childCount === 0) {
          console.log("Destroying item due to backspace on empty item.");
          onEventRef.current!({tag: "action", action: "destroy"});
          // [TODO] Shouldn't we also return here?
        }

        // We don't want to handle anything by default.
        return false;
      },
    },
  });

  const externalLinkDecorationPlugin = createExternalLinkDecorationPlugin({
    openExternalUrl(url: string) {
      onEventRef.current!({tag: "openUrl", url});
    },
  });

  const pastePlugin = new PS.Plugin({
    props: {
      handlePaste(view, ev, slice) {
        const text = ev.clipboardData?.getData("text/plain");

        if (text !== undefined && E.isParagraphFormattedText(text)) {
          onEventRef.current!({tag: "paste", paragraphs: E.paragraphs(text)});
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
        onEventRef.current!({tag: "focus"});
        return false;
      },
    },
  });

  const proseMirrorState = React.useMemo(
    () =>
      toProseMirror(props.editor, {
        openLink: (link) => onEventRef.current!({tag: "open", link}),
        jumpLink: (link) => onEventRef.current!({tag: "jump", link}),
        plugins: [keyPlugin, pastePlugin, externalLinkDecorationPlugin, focusPlugin],
      }),
    [props.editor],
  );

  return (
    <ProseMirror
      state={proseMirrorState}
      onStateUpdated={(state) => onEventRef.current!({tag: "edit", editor: fromProseMirror(state)})}
      hasFocus={props.hasFocus}
    />
  );
}
