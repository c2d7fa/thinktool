import * as React from "react";
import * as PS from "prosemirror-state";
import * as PV from "prosemirror-view";
import * as PM from "prosemirror-model";

import * as D from "../data";
import * as T from "../tree";
import * as E from "../editing";
import * as Sh from "../shortcuts";
import * as Ac from "../actions";
import {Context} from "../context";

import {ExternalLink as BaseExternalLink} from "./ExternalLink"; // Silly naming conflict
import Bullet from "./Bullet";

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

  let className = "internal-link";
  if (T.isLinkOpen(props.context.tree, props.node, props.link)) className += " internal-link-open";
  if (D.isPage(props.context.state, props.link)) className += " internal-link-page";

  function toggle() {
    props.context.setTree(T.toggleLink(props.context.state, props.context.tree, props.node, props.link));
  }

  function jump() {
    props.context.setSelectedThing(props.link);
  }

  return (
    <span
      className={className}
      onMouseDown={(ev) => {
        ev.preventDefault();
      }}
      onAuxClick={(ev) => {
        const isMiddleClick = ev.button === 1;
        if (isMiddleClick) {
          jump();
        }
      }}
      onClick={(ev) => {
        if (ev.shiftKey) jump();
        else toggle();
      }}>
      <Bullet
        specialType="link"
        status={terminal ? "terminal" : expanded ? "expanded" : "collapsed"}
        toggle={toggle}
        beginDrag={(ev) => {
          // [TODO] This is undefined on mobile. This may or may not cause issues; I haven't tested it.
          if (ev !== undefined) ev.preventDefault();
        }}
      />
      &nbsp;
      <span className="link-content">
        {content === "" ? <span className="empty-content">{props.link}</span> : content}
      </span>
    </span>
  );
}

function RenderedContent(props: {
  context: Context;
  node: T.NodeRef;
  onKeyDown?(ev: KeyboardEvent, notes: {startOfItem: boolean; endOfItem: boolean}): boolean;
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
      className={`editor content`}>
      {fragments.length === 0 ? <span className="placeholder-empty">(Empty)</span> : <span>{fragments}</span>}
    </div>
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
        const element = document.createElement("span");
        element.className = "internal-link-editing";
        element.onclick = node.attrs.onclick;
        element.onmousedown = (ev) => ev.preventDefault(); // Don't move text cursor when clicking
        element.textContent = node.attrs.content;
        return element;
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
}) {
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
            props.onAction(action);
            return true;
          }
        }

        // We don't want to handle anything by default.
        return false;
      },
    },
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

  // As the name suggests, we initialize `initialState` once, and don't update
  // it again. But it needs access to the current state. So we use this hack. I
  // think the difficulty here comes from integrating with ProseMirror, but I
  // still feel like there should be a better way.

  const stateRef = React.useRef<D.State>(props.context.state);
  React.useEffect(() => {
    stateRef.current = props.context.state;
  }, [props.context.state]);

  const initialState = PS.EditorState.create({
    schema,
    doc: docFromContent(
      D.content(props.context.state, T.thing(props.context.tree, props.node)),
      (thing) => D.contentText(stateRef.current, thing),
      (thing) => {
        // [TODO]
        console.warn("Unimplemented: Open link %o", thing);
      },
    ),
    plugins: [keyPlugin, pastePlugin],
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
    if (editorViewRef.current!.state !== editorState || editorState === initialState) {
      editorViewRef.current!.updateState(editorState);

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
            tr.replaceSelectionWith(schema.node("link", {target, content: textContent}));
            return es.apply(tr);
          });
        },
      });
    }

    if (
      E.contentToEditString(D.content(props.context.state, T.thing(props.context.tree, props.node))) !==
      E.contentToEditString(contentFromDoc(editorState.doc))
    ) {
      props.context.setState(
        D.setContent(
          props.context.state,
          T.thing(props.context.tree, props.node),
          contentFromDoc(editorState.doc),
        ),
      );
    }
  });

  React.useEffect(
    function acceptFocus() {
      if (T.hasFocus(props.context.tree, props.node)) {
        editorViewRef.current?.focus();
      }
    },
    [T.focused(props.context.tree)],
  );

  return <div className="editor content" ref={ref}></div>;
}

export default function Editor(props: {
  context: Context;
  node: T.NodeRef;
  placeholder?: string;
  onAction(action: Ac.ActionName): void;
}) {
  if (T.hasFocus(props.context.tree, props.node)) {
    return <ContentEditor {...props} />;
  } else {
    return <RenderedContent {...props} />;
  }
}
