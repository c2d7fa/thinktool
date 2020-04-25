import {Context} from "./context";
import * as T from "./tree";
import * as D from "./data";

export function actionsWith(context: Context, node: T.NodeRef) {
  // Q: Why do we set T.focus(context.tree, node) in some of these?
  //
  // A: This is a hack for the fact that when the user clicks a button in the
  // toolbar, the focus is lost. So instead the consumer of this function passes
  // in a special "target", which is the item that is *supposed* to be focused.
  //
  // Some of the functions we call here, e.g. indent(), have special behavior
  // depending on the currently focused item, so in those cases we need to
  // actually set the focus.

  return {
    showSiblingPopup(): void {
      context.setPopupTarget(node);
      context.setActivePopup((state, tree, target, selection) => {
        const [newState, newTree] = T.insertSiblingAfter(state, tree, target, selection);
        return [newState, newTree];
      });
    },

    showChildPopup(): void {
      context.setPopupTarget(node);
      context.setActivePopup((state, tree, target, selection) => {
        const [newState, newTree] = T.insertChild(state, tree, target, selection, 0);
        return [newState, newTree];
      });
    },

    showParentPopup(): void {
      context.setPopupTarget(node);
      context.setActivePopup((state, tree, target, selection) => {
        const [newState, newTree] = T.insertParent(state, tree, target, selection);
        return [newState, newTree];
      });
    },

    showTagPopup(): void {
      context.setPopupTarget(node);
      context.setActivePopup((state, tree, target, selection) => {
        return T.setTag(state, tree, target, selection);
      });
    },

    showLinkPopup(): void {
      const textSelection = context.selectionInFocusedContent;
      if (textSelection === null) throw "Selection wasn't saved; can't insert link.";

      context.setPopupTarget(node);
      context.setActivePopup((state, tree, target, selection) => {
        if (target !== node) throw "Invalid target/node";

        const content = D.content(context.state, T.thing(context.tree, node));
        const newContent =
          content.substring(0, textSelection.start) + `#${selection}` + content.substring(textSelection.end);
        const newState = D.setContent(state, T.thing(tree, target), newContent);

        return [newState, tree];
      });
    },

    createSiblingAfter(): void {
      const [newState, newTree, _, newId] = T.createSiblingAfter(context.state, context.tree, node);
      context.setState(newState);
      context.setTree(T.focus(newTree, newId));
    },

    zoom(): void {
      context.setSelectedThing(T.thing(context.tree, node));
    },

    indent() {
      const [newState, newTree] = T.indent(context.state, T.focus(context.tree, node), node);
      context.setState(newState);
      context.setTree(newTree);
    },

    unindent() {
      const [newState, newTree] = T.unindent(context.state, T.focus(context.tree, node), node);
      context.setState(newState);
      context.setTree(newTree);
    },

    moveDown() {
      const [newState, newTree] = T.moveDown(context.state, T.focus(context.tree, node), node);
      context.setState(newState);
      context.setTree(newTree);
    },

    moveUp() {
      const [newState, newTree] = T.moveUp(context.state, T.focus(context.tree, node), node);
      context.setState(newState);
      context.setTree(newTree);
    },

    createChild() {
      const [newState, newTree, _, newId] = T.createChild(context.state, context.tree, node);
      context.setState(newState);
      context.setTree(T.focus(newTree, newId));
    },

    removeFromParent() {
      const [newState, newTree] = T.remove(context.state, context.tree, node);
      context.setState(newState);
      context.setTree(newTree);
    },

    delete() {
      const [newState, newTree] = T.removeThing(context.state, context.tree, node);
      context.setState(newState);
      context.setTree(newTree);
    },

    clone() {
      const [newState, newTree] = T.clone(context.state, context.tree, node);
      context.setState(newState);
      context.setTree(newTree);
    },

    untag() {
      const [newState, newTree] = T.setTag(context.state, context.tree, node, null);
      context.setState(newState);
      context.setTree(newTree);
    },
  };
}
