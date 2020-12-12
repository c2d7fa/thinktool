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
import {NodeStatus} from "../node-status";

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
  status: NodeStatus;
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
      className={classes({"internal-link": true, "internal-link-open": status === "expanded"})}
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
      }}>
      <Bullet
        specialType="link"
        status={args.status}
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
  status: NodeStatus;
  content: string | null;
  jump: () => void;
  target: string;
  toggle: () => void;
};

const schema = new PM.Schema({
  nodes: {
    doc: {content: "(text | link)*"},
    link: {
      attrs: {target: {}, status: {}, jump: {}, toggle: {}, content: {}},
      inline: true,
      atom: true,
      selectable: false,
      toDOM(node) {
        const attrs = node.attrs as LinkAttrs;
        return buildInternalLink({
          status: attrs.status,
          jump: attrs.jump,
          toggle: attrs.toggle,
          content: attrs.content ? attrs.content : {invalid: attrs.target},
        });
      },
    },
    text: {},
  },
});

function docFromContent({
  content,
  textContentOf,
  openLink,
  jumpLink,
  openLinks,
}: {
  content: D.Content;
  textContentOf: (thing: string) => string | null;
  openLink: (link: string) => void;
  jumpLink: (link: string) => void;
  openLinks: string[];
}): PM.Node<typeof schema> {
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
        status: openLinks.includes(contentNode.link) ? "expanded" : "collapsed",
        toggle: () => openLink(contentNode.link),
        jump: () => jumpLink(contentNode.link),
        content: textContentOf(contentNode.link),
      };
      nodes.push(schema.node("link", attrs));
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
  onJumpLink(target: string): void;
}) {
  const stateRef = usePropRef(props.context.state);
  const treeRef = usePropRef(props.context.tree);
  const onOpenLinkRef = usePropRef(props.onOpenLink);
  const onJumpLinkRef = usePropRef(props.onJumpLink);
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

  // When the user clicks on this editor to focus it, we want to communicate
  // that back to the state managed by React. This plugin handles that.
  const focusPlugin = new PS.Plugin({
    props: {
      handleClick(view, pos, ev) {
        props.context.setTree(T.focus(treeRef.current!, props.node));

        return false;
      },
    },
  });

  const [openLinks, setOpenLinks] = React.useState<string[]>([]);
  const openLinksRef = usePropRef(openLinks);

  function linkToggled(link: string): void {
    if (openLinksRef.current!.includes(link)) {
      setOpenLinks((openLinks) => openLinks.filter((openedLink) => openedLink !== link));
    } else {
      setOpenLinks((openLinks) => [...openLinks, link]);
    }
  }

  const initialState = PS.EditorState.create({
    schema,
    doc: docFromContent({
      content: D.content(props.context.state, T.thing(props.context.tree, props.node)),
      textContentOf: (thing) =>
        D.exists(stateRef.current!, thing) ? D.contentText(stateRef.current!, thing) : null,
      openLink: (thing) => {
        onOpenLinkRef.current!(thing);
        linkToggled(thing);
      },
      jumpLink: (thing) => onJumpLinkRef.current!(thing),
      openLinks: openLinksRef.current!,
    }),
    plugins: [keyPlugin, pastePlugin, externalLinkDecorationPlugin, focusPlugin],
  });

  const editorViewRef = React.useRef<PV.EditorView<typeof schema> | null>(null);

  const setStateRef = usePropRef(props.context.setState);

  // Initialize editor
  React.useEffect(() => {
    function dispatchTransaction(
      this: PV.EditorView<typeof schema>,
      transaction: PS.Transaction<typeof schema>,
    ) {
      this.updateState(this.state.apply(transaction));

      // This is where we communicate changes made by the user back into the
      // state managed by React.

      const editorDoc = this.state.doc;

      // We don't need to update anything if the transaction didn't actually
      // change any of the content.
      if (
        E.contentToEditString(D.content(stateRef.current!, T.thing(treeRef.current!, props.node))) ===
        E.contentToEditString(contentFromDoc(editorDoc))
      )
        return;

      setStateRef.current!(
        D.setContent(stateRef.current!, T.thing(treeRef.current!, props.node), contentFromDoc(editorDoc)),
      );
    }

    editorViewRef.current = new PV.EditorView(ref.current!, {state: initialState, dispatchTransaction});
  }, []);

  // When the state managed by React gets updated from elsewhere, we want to
  // reflect those updates in the editor state.
  React.useEffect(() => {
    // It should have focus but doesn't for some reason. I don't know why this
    // happens, but it does. Probably related to popup. When we insert a link,
    // we need this, I think.
    if (T.focused(treeRef.current!) === props.node) {
      console.log("Forced focus")
      editorViewRef.current!.focus();
    }

    // If this editor has focus, then the changes were probably made via the
    // editor itself. In that case, we wouldn't want to update the editor again.
    if (editorViewRef.current!.hasFocus()) return;

    editorViewRef.current!.updateState(
      PS.EditorState.create({
        schema,
        doc: docFromContent({
          content: D.content(props.context.state, T.thing(props.context.tree, props.node)),
          textContentOf: (thing) =>
            D.exists(stateRef.current!, thing) ? D.contentText(stateRef.current!, thing) : null,
          openLink: (thing) => {
            onOpenLinkRef.current!(thing);
            linkToggled(thing);
          },
          jumpLink: (thing) => onJumpLinkRef.current!(thing),
          openLinks: openLinksRef.current!,
        }),
        plugins: [keyPlugin, pastePlugin, externalLinkDecorationPlugin, focusPlugin],
      }),
    );
  }, [props.context.state, props.node, openLinks]);

  React.useEffect(() => {
    if (!T.hasFocus(props.context.tree, props.node)) return;

    editorViewRef.current!.focus();

    // The popup that appears e.g. when inserting a link needs to have access
    // to the current selection.
    const textSelection = (() => {
      let content: D.Content = [];
      editorViewRef.current!.state.selection.content().content.forEach((node) => {
        if (node.isText) {
          content.push(node.textContent);
        } else if (node.type.name === "link") {
          content.push({link: node.attrs.target});
        }
      });
      return E.contentToEditString(content);
    })();

    // [TODO] Technically, we should react to changes in
    // registerActiveEditor, although I don't think we actually update this
    // anywhere currently.
    props.context.registerActiveEditor({
      selection: textSelection,

      replaceSelectionWithLink(target: string, textContent: string): void {
        editorViewRef.current!.focus();

        const tr = editorViewRef.current!.state.tr;
        const attrs: LinkAttrs = {
          target,
          status: openLinksRef.current!.includes(target) ? "expanded" : "collapsed",
          toggle: () => onOpenLinkRef.current!(target),
          jump: () => onJumpLinkRef.current!(target),
          content: textContent,
        };
        tr.replaceSelectionWith(schema.node("link", attrs));

        editorViewRef.current!.dispatch(tr);
      },
    });
  }, [T.focused(props.context.tree)]);

  return <div className="editor content" ref={ref}></div>;
}

export default function Editor(props: {
  context: Context;
  node: T.NodeRef;
  placeholder?: string;
  onAction(action: Ac.ActionName): void;
  onOpenLink(target: string): void;
  onJumpLink(target: string): void;
}) {
  return <ContentEditor {...props} />;
}
