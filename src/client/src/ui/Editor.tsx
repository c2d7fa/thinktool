import * as React from "react";
import * as ReactDOMServer from "react-dom/server";

const style = require("../editor.module.scss").default;

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
import {usePropRef} from "../react-utils";

import Bullet from "./Bullet";

function buildInternalLink(args: {
  jump(): void;
  toggle(): void;
  content: {invalid: string} | string;
}): HTMLElement {
  const container = document.createElement("span");

  // We already wrote <Bullet>, but we don't want React to manage it, so we use
  // this somewhat hacky approach where we render the markup to a string and
  // then manually attach the event listeners.

  const markup = ReactDOMServer.renderToStaticMarkup(
    <span className={style.itemlink}>
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
      <span className={style.linkcontent}>
        {typeof args.content === "string" ? (
          args.content
        ) : (
          <span className="invalid-link-id">{args.content.invalid}</span>
        )}
      </span>
    </span>,
  );

  container.innerHTML = markup;

  const linkElement = container.querySelector("span")!;
  linkElement.onmousedown = (ev) => {
    ev.preventDefault();
  };
  linkElement.onauxclick = (ev) => {
    const isMiddleClick = ev.button === 1;
    if (isMiddleClick) {
      args.jump();
    }
  };
  linkElement.onclick = (ev) => {
    if (ev.shiftKey) args.jump();
    else args.toggle();
  };

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

function createPlaceholderDecorationPlugin(): PS.Plugin<typeof schema> {
  return new PS.Plugin({
    props: {
      decorations(state: PS.EditorState<PM.Schema>) {
        if (state.doc.childCount === 0) {
          return PV.DecorationSet.create(state.doc, [
            PV.Decoration.widget(
              0,
              () => {
                const element = document.createElement("span");
                element.classList.add("placeholder");

                element.appendChild(document.createTextNode("Press "));

                const shortcut = document.createElement("kbd");
                shortcut.textContent = "Alt-X";
                element.appendChild(shortcut);

                element.appendChild(document.createTextNode(" to connect an existing item."));

                return element;
              },
              {key: "placeholder"},
            ),
          ]);
        } else {
          return PV.DecorationSet.create(state.doc, []);
        }
      },
    },
  });
}

// By default, we don't get focus updates when the user clicks on the editor but
// doesn't change the cursor position, so we have to listen for these types of
// updates manually; see also the comment in <ProseMirror>.
function createFocusPlugin(args: {onFocus(): void}): PS.Plugin<typeof schema> {
  return new PS.Plugin({
    props: {
      handleClick(view) {
        args.onFocus();
        return false;
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
  | {tag: "edit"; editor: E.Editor; focused: boolean}
  | {tag: "paste"; paragraphs: string[]}
  | {tag: "openUrl"; url: string};

// Side-effects aren't handled in this function. Instead, they are described by
// 'effects' in the return value and must be handled by the caller.
export function handling(app: App, node: T.NodeRef) {
  return (
    ev: Event,
  ): {
    app: App;
    effects?: {search?: {items: {thing: string; content: string}[]; query: string}; url?: string};
  } => {
    if (ev.tag === "edit") {
      let result = app;
      if (ev.focused) result = A.merge(app, {tree: T.focus(app.tree, node)});
      if (!ev.focused && T.hasFocus(app.tree, node)) result = A.merge(app, {tree: T.unfocus(app.tree)});
      result = A.edit(result, node, ev.editor);
      return {app: result};
    } else if (ev.tag === "open") {
      return {app: A.toggleLink(app, node, ev.link)};
    } else if (ev.tag === "jump") {
      return {app: A.jump(app, ev.link)};
    } else if (ev.tag === "paste") {
      return {app: onPastedParagraphs(app, node, ev.paragraphs)};
    } else if (ev.tag === "action") {
      const result = Ac.update(app, ev.action);
      if (result.url) return {app: result.app, effects: {url: result.url}};
      if (result.search) return {app: result.app, effects: {search: result.search}};
      return {app: result.app};
    } else if (ev.tag === "openUrl") {
      return {app: app, effects: {url: ev.url}};
    } else {
      throw "unhandled case";
    }
  };
}

export function forNode(app: App, node: T.NodeRef): {editor: E.Editor; hasFocus: boolean} {
  function require<T>(x: T | null): T {
    if (x === null) throw "unexpected null";
    return x;
  }

  return {
    editor: require(A.editor(app, node)),
    hasFocus: T.hasFocus(app.tree, node),
  };
}

export function StaticContent(props: {content: E.EditorContent}) {
  return (
    <Editor editor={{selection: {from: 0, to: 0}, content: props.content}} hasFocus={false} onEvent={() => {}} />
  );
}

export const Editor = React.memo(
  function Editor(props: {editor: E.Editor; hasFocus: boolean; onEvent(event: Event): void}) {
    const onEventRef = usePropRef(props.onEvent);
    const editorRef = usePropRef(props.editor);

    const focusPlugin = React.useMemo(
      () =>
        createFocusPlugin({
          onFocus() {
            onEventRef.current!({tag: "edit", editor: editorRef.current!, focused: true});
          },
        }),
      [],
    );

    const placeholderPlugin = React.useMemo(() => createPlaceholderDecorationPlugin(), []);

    const keyPlugin = React.useMemo(
      () =>
        new PS.Plugin({
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

              if (ev.key === "Escape") {
                onEventRef.current!({tag: "edit", editor: editorRef.current!, focused: false});
                return true;
              }

              // We don't want to handle anything by default.
              return false;
            },
          },
        }),
      [],
    );

    const externalLinkDecorationPlugin = React.useMemo(
      () =>
        createExternalLinkDecorationPlugin({
          openExternalUrl(url: string) {
            onEventRef.current!({tag: "openUrl", url});
          },
        }),
      [],
    );

    const pastePlugin = React.useMemo(
      () =>
        new PS.Plugin({
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
        }),
      [],
    );

    const proseMirrorState = React.useMemo(
      () =>
        toProseMirror(props.editor, {
          openLink: (link) => onEventRef.current!({tag: "open", link}),
          jumpLink: (link) => onEventRef.current!({tag: "jump", link}),
          plugins: [focusPlugin, placeholderPlugin, keyPlugin, pastePlugin, externalLinkDecorationPlugin],
        }),
      [props.editor],
    );

    return (
      <ProseMirror
        state={proseMirrorState}
        onStateUpdated={(state, {focused}) =>
          onEventRef.current!({tag: "edit", editor: fromProseMirror(state), focused})
        }
        hasFocus={props.hasFocus}
      />
    );
  },
  (prev, next) =>
    E.editorEq(prev.editor, next.editor) && prev.hasFocus === next.hasFocus && prev.onEvent === next.onEvent,
);
