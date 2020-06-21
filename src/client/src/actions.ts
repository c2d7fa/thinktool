import {Context} from "./context";
import * as T from "./tree";
import * as D from "./data";
import * as Tutorial from "./tutorial";
import * as E from "./editing";

export function actionsWith(context: Context, node: T.NodeRef) {
  // We sometimes call this function with node = null, even though the signature
  // claims that this is not allowed. This is a pretty bad hack, and should
  // definitely be fixed. See <Toolbar>.

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

    showLinkPopup(): void {
      const textSelection = context.selectionInFocusedContent;
      if (textSelection === null) throw "Selection wasn't saved; can't insert link.";

      context.setPopupTarget(node);
      context.setActivePopup((state, tree, target, selection) => {
        if (target !== node) throw "Invalid target/node";

        const editing = E.contentToEditString(D.content(context.state, T.thing(context.tree, node)));
        const newEditing =
          editing.substring(0, textSelection.start) + `#${selection}` + editing.substring(textSelection.end);
        const newState = D.setContent(state, T.thing(tree, target), E.contentFromEditString(newEditing));

        return [newState, tree];
      });
    },

    showSearchPopup(): void {
      // This is a hack on how setActivePopup is supposed to be used.
      context.setPopupTarget({id: 0});
      context.setActivePopup((state, tree, target, selection) => {
        context.setSelectedThing(selection);
        return [state, tree];
      });
    },

    createSiblingAfter(): void {
      if (node === null) {
        const [newState, newTree, _, newId] = T.createChild(
          context.state,
          context.tree,
          T.root(context.tree),
        );
        context.setState(newState);
        context.setTree(T.focus(newTree, newId));
      } else {
        const [newState, newTree, _, newId] = T.createSiblingAfter(context.state, context.tree, node);
        context.setState(newState);
        context.setTree(T.focus(newTree, newId));
      }
    },

    zoom(): void {
      context.setSelectedThing(T.thing(context.tree, node));
    },

    indent() {
      const [newState, newTree] = T.indent(context.state, context.tree, node);
      context.setState(newState);
      context.setTree(newTree);
    },

    unindent() {
      const [newState, newTree] = T.unindent(context.state, context.tree, node);
      context.setState(newState);
      context.setTree(newTree);
    },

    moveDown() {
      const [newState, newTree] = T.moveDown(context.state, context.tree, node);
      context.setState(newState);
      context.setTree(newTree);
    },

    moveUp() {
      const [newState, newTree] = T.moveUp(context.state, context.tree, node);
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

    resetTutorial() {
      context.setTutorialState(Tutorial.reset(context.tutorialState));
    },
  };
}
