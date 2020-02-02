import * as React from "react";

import * as Slate from "slate";
import * as SlateReact from "slate-react";

// #region Lines in the editor

// The editor may contain multiple lines of text. When it makes sense to do so,
// the user should be able to navigate up and down the editor using the arrow up
// and down keys.
//
// However, on the first and last line, we want to allow our parent to handle
// arrow up and arrow down key events, respectively. Unfortunately, there is no
// easy way to check whether the selection is currently on the first or the last
// line of a Slate editor, so we use the following code instead.

function currentSelectionIsOnFirstLineOfSelectedElement(): boolean {
  const selection = window.getSelection();
  if (selection == undefined) return false;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const testRange = document.createRange();
  testRange.setStart(range.startContainer, 0);
  testRange.collapse();
  selection.removeAllRanges();
  selection.addRange(testRange);

  const testRect = testRange.getBoundingClientRect();

  selection.removeAllRanges();
  selection.addRange(range);

  return rect.top === testRect.top;
}

function currentSelectionIsOnLastLineOfSelectedElement(): boolean {
  const selection = window.getSelection();
  if (selection == undefined) return false;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const testRange = document.createRange();
  testRange.setStart(range.startContainer, (range.startContainer as Text).length);
  testRange.collapse();
  selection.removeAllRanges();
  selection.addRange(testRange);

  const testRect = testRange.getBoundingClientRect();

  selection.removeAllRanges();
  selection.addRange(range);

  return rect.top === testRect.top;
}

function atFirstLineInEditor(): boolean {
  return currentSelectionIsOnFirstLineOfSelectedElement();
}

function atLastLineInEditor(): boolean {
  return currentSelectionIsOnLastLineOfSelectedElement();
}

// #endregion

function decorate([node, path]: [Slate.Node, Slate.Path]): Slate.Range[] {
  const text = Slate.Node.string(node);

  let ranges: Slate.Range[] = [];

  const linkRegex = /https?:\/\S*/g;
  for (const match of text.matchAll(linkRegex) ?? []) {
    if (match.index === undefined) throw "bad programmer error";

    const start = match.index;
    let end = match.index + match[0].length;

    // Trim punctuation at the end of link:
    if ([",", ".", ":", ")", "]"].includes(text[end - 1])) {
      end -= 1;
    }

    ranges = [...ranges, {anchor: {path, offset: start}, focus: {path, offset: end}, link: text.slice(start, end)}];
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
      onAuxClick: (ev) => {
        if (ev.button === 1) { // Middle click
          window.open(props.leaf.link);
          ev.preventDefault();
        }
      },
      title: `${props.leaf.link}\n(Open with middle click)`,
    };

    return <a className="plain-text-link" href={props.leaf.link} {...clickProps} {...props.attributes}>{props.children}</a>;
  } else {
    return <SlateReact.DefaultLeaf {...props}/>;
  }
}

function nodesFromText(text: string): Slate.Node[] {
  return [{type: "paragraph", children: [{text}]}];
}

function nodesToText(nodes: Slate.Node[]): string {
  let result = Slate.Node.string(nodes[0]);
  for (const node of nodes.slice(1)) {
    result += "\n" + Slate.Node.string(node);
  }
  return result;
}

export function PlainText(props: {focused?: boolean; text: string; setText(text: string): void; className?: string; onFocus?(ev: React.FocusEvent<{}>): void; onKeyDown?(ev: React.KeyboardEvent<{}>, notes: {startOfItem: boolean; endOfItem: boolean}): boolean; placeholder?: string}) {
  const editor = React.useMemo(() => SlateReact.withReact(Slate.createEditor()), []);
  const [value, setValue] = React.useState(nodesFromText(props.text));
  const divRef = React.useRef<HTMLDivElement>(null);

  // I don't entirely understand how focus is supposed to be handled in Slate,
  // so we use a bit of a hack (or at least, I think it's a hack).
  //
  // Basically, the parent can pass the "focused" property. When this is updated
  // such that it becomes true, we manually transfer focus to the Slate editor
  // using the Effect below.
  //
  // I would have thought that simply calling SlateReact.ReactEditor.focus(editor)
  // would be enough, but apparently this is not the case, so we do some other
  // stuff as well.

  React.useEffect(() => {
    if (props.focused) {
      if (!SlateReact.ReactEditor.isFocused(editor)) {
        SlateReact.ReactEditor.focus(editor);
        Slate.Transforms.select(editor, editor.selection ?? Slate.Editor.start(editor, []));
      }
    }
  }, [props.focused]);

  React.useEffect(() => {
    if (props.text !== nodesToText(value))
      setValue(nodesFromText(props.text));
  }, [props.text]);

  function onChange(nodes: Slate.Node[]): void {
    if (nodesToText(nodes) !== props.text) {
      props.setText(nodesToText(nodes));
    }
    setValue(nodes);
  }

  function onKeyDown(ev: React.KeyboardEvent): void {
    if ((ev.key === "ArrowUp" && !atFirstLineInEditor() || ev.key === "ArrowDown" && !atLastLineInEditor()) && !(ev.ctrlKey || ev.altKey)) {
      // Arrow key without modifiers inside text. Use normal action.
      return;
    }

    if (!editor.selection) throw "bad programmer error";
    const startOfItem = Slate.Point.equals(Slate.Range.start(editor.selection), Slate.Editor.start(editor, []));
    const endOfItem = Slate.Point.equals(Slate.Range.end(editor.selection), Slate.Editor.end(editor, []));

    if (props.onKeyDown !== undefined && props.onKeyDown(ev, {startOfItem, endOfItem})) {
      // The event was handled by our parent.
      ev.preventDefault();
      return;
    } else {
      if (ev.key === "Enter") {
        editor.insertText("\n");
        ev.preventDefault();
      }

      return;
    }
  }

  return (
    <div ref={divRef} className={`content-editable-plain-text ${props.className}`}>
      <SlateReact.Slate editor={editor} value={value} onChange={onChange}>
        <SlateReact.Editable renderLeaf={renderLeaf} decorate={decorate} onKeyDown={onKeyDown} onFocus={props.onFocus}/>
      </SlateReact.Slate>
    </div>
  );
}
