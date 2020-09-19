import * as React from "react";
import * as ReactDOM from "react-dom";
import * as PS from "prosemirror-state";
import * as PV from "prosemirror-view";
import * as PM from "prosemirror-model";
import {classes} from "@johv/miscjs";

import * as D from "../data";
import * as T from "../tree";
import * as E from "../editing";
import * as Sh from "../shortcuts";
import * as Ac from "../actions";
import {Context} from "../context";

import {ExternalLink as BaseExternalLink} from "./ExternalLink"; // Silly naming conflict
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

function InternalLink(props: {
  status: "expanded" | "collapsed" | "terminal";
  jump(): void;
  toggle(): void;
  children: React.ReactNode;
}) {
  return (
    <span
      className={classes({"internal-link": true, "internal-link-open": status === "expanded"})}
      onMouseDown={(ev) => {
        ev.preventDefault();
      }}
      onAuxClick={(ev) => {
        const isMiddleClick = ev.button === 1;
        if (isMiddleClick) {
          props.jump();
        }
      }}
      onClick={(ev) => {
        if (ev.shiftKey) props.jump();
        else props.toggle();
      }}>
      <Bullet
        specialType="link"
        status={props.status}
        toggle={props.toggle}
        beginDrag={(ev) => {
          // [TODO] This is undefined on mobile. This may or may not cause issues; I haven't tested it.
          if (ev !== undefined) ev.preventDefault();
        }}
      />
      &nbsp;
      <span className="link-content">{props.children}</span>
    </span>
  );
}

const schema = new PM.Schema({
  nodes: {
    doc: {content: "(text | link)*"},
    link: {
      attrs: {target: {}, onclick: {}, content: {}},
      inline: true,
      atom: true,
      selectable: false,
      toDOM(node) {
        const container = document.createElement("span");
        ReactDOM.render(
          // [TODO] Using placeholder for status; we should set this to the real value.
          <InternalLink status={"collapsed"} jump={node.attrs.onclick} toggle={node.attrs.onclick}>
            {node.attrs.content}
          </InternalLink>,
          container,
        );
        return container;
      },
    },
    text: {},
  },
});

function docFromContent(
  content: D.Content,
  textContentOf: (thing: string) => string,
  openLink: (link: string) => void,
): PM.Node<typeof schema> {
  const nodes = [];

  for (const contentNode of content) {
    if (typeof contentNode === "string") {
      nodes.push(schema.text(contentNode));
    } else if (contentNode.link !== undefined) {
      // We store the 'onclick' callback on each node. Perhaps it would make
      // more sense to only pass in the target here, and construct that callback
      // in the 'toDOM' method. But that would require the schema to have access
      // to the application state, which also feels weird.
      nodes.push(
        schema.node("link", {
          target: contentNode.link,
          onclick: () => openLink(contentNode.link),
          content: textContentOf(contentNode.link),
        }),
      );
    }
  }

  return schema.node("doc", {}, nodes);
}

function createExternalLinkDecorationPlugin(args: {
  openExternalUrl(url: string): void;
}): PS.Plugin<typeof schema> {
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

function contentFromDoc(doc: PM.Node<typeof schema>): D.Content {
  const content: D.Content = [];

  doc.forEach((node) => {
    if (node.isText) {
      content.push(node.textContent);
    } else if (node.type.name === "link") {
      content.push({link: node.attrs.target});
    }
  });

  return content;
}

function ContentEditor(props: {
  context: Context;
  node: T.NodeRef;
  placeholder?: string;
  onAction(action: Ac.ActionName): void;
  onOpenLink(target: string): void;
}) {
  const stateRef = usePropRef(props.context.state);
  const onOpenLinkRef = usePropRef(props.onOpenLink);
  const onActionRef = usePropRef(props.onAction);

  const ref = React.useRef<HTMLDivElement>(null);

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

        // We don't want to handle anything by default.
        return false;
      },
    },
  });

  const externalLinkDecorationPlugin = createExternalLinkDecorationPlugin({
    openExternalUrl: props.context.openExternalUrl,
  });

  const pastePlugin = new PS.Plugin({
    props: {
      handlePaste(view, ev, slice) {
        const text = ev.clipboardData?.getData("text/plain");

        if (text !== undefined && E.isParagraphFormattedText(text)) {
          const paragraphs = E.paragraphs(text);

          let [state, tree] = [props.context.state, props.context.tree];
          let lastNode = props.node;

          for (const paragraph of paragraphs) {
            const [state_, tree_, thing, lastNode_] = T.createSiblingAfter(state, tree, lastNode);
            [state, tree, lastNode] = [state_, tree_, lastNode_];

            state = D.setContent(state, thing, [paragraph]);
          }

          props.context.setState(state);
          props.context.setTree(tree);

          return true;
        }

        return false;
      },
    },
  });

  const initialState = PS.EditorState.create({
    schema,
    doc: docFromContent(
      D.content(props.context.state, T.thing(props.context.tree, props.node)),
      (thing) => D.contentText(stateRef.current!, thing),
      (thing) => onOpenLinkRef.current!(thing),
    ),
    plugins: [keyPlugin, pastePlugin, externalLinkDecorationPlugin],
  });

  const [editorState, setEditorState] = React.useState(initialState);

  const editorViewRef = React.useRef<PV.EditorView<typeof schema> | null>(null);

  // Initialize editor
  React.useEffect(() => {
    function dispatchTransaction(transaction: PS.Transaction<typeof schema>) {
      setEditorState((previousState) => previousState.apply(transaction));
    }

    editorViewRef.current = new PV.EditorView(ref.current!, {state: initialState, dispatchTransaction});
  }, []);

  React.useEffect(() => {
    // Reflect changes in ProseMirror editor.
    if (editorViewRef.current!.state !== editorState) {
      editorViewRef.current!.updateState(editorState);
    }

    if (editorViewRef.current!.hasFocus()) {
      props.context.setTree(T.focus(props.context.tree, props.node));

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

      props.context.registerActiveEditor({
        selection: textSelection,

        replaceSelectionWithLink(target: string, textContent: string): void {
          editorViewRef.current!.focus();

          setEditorState((es) => {
            const tr = es.tr;
            tr.replaceSelectionWith(
              schema.node("link", {
                target,
                onclick: () => onOpenLinkRef.current!(target),
                content: textContent,
              }),
            );
            return es.apply(tr);
          });
        },
      });
    }
  }, [editorState]);

  // Handle incoming changes to content
  React.useEffect(() => {
    // We shouldn't override the user's changes.
    if (editorViewRef.current!.hasFocus()) return;

    setEditorState(
      PS.EditorState.create({
        schema,
        doc: docFromContent(
          D.content(props.context.state, T.thing(props.context.tree, props.node)),
          (thing) => D.contentText(stateRef.current!, thing),
          (thing) => onOpenLinkRef.current!(thing),
        ),
        plugins: [keyPlugin, pastePlugin, externalLinkDecorationPlugin],
      }),
    );
  }, [props.context.state, props.node]);

  // Handle outgoing changes
  React.useEffect(() => {
    if (!editorViewRef.current!.hasFocus()) return; // The user wasn't responsible for the change

    if (
      E.contentToEditString(D.content(props.context.state, T.thing(props.context.tree, props.node))) ===
      E.contentToEditString(contentFromDoc(editorState.doc))
    )
      return;

    props.context.setState(
      D.setContent(
        props.context.state,
        T.thing(props.context.tree, props.node),
        contentFromDoc(editorState.doc),
      ),
    );
  });

  React.useEffect(() => {
    if (T.hasFocus(props.context.tree, props.node)) {
      editorViewRef.current!.focus();
    }
  }, [T.focused(props.context.tree)]);

  return <div className="editor content" ref={ref}></div>;
}

export default function Editor(props: {
  context: Context;
  node: T.NodeRef;
  placeholder?: string;
  onAction(action: Ac.ActionName): void;
  onOpenLink(target: string): void;
}) {
  return <ContentEditor {...props} />;
}
