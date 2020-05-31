import * as React from "react";

export type Shortcut = {mod?: boolean; secondaryMod?: boolean; ctrlLikeMod?: boolean; key: string};

function implies(b: boolean, c: boolean) {
  return !b || (b && c);
}

function capitalize(s: string) {
  return s.substr(0, 1).toUpperCase() + s.substr(1);
}

function ifMacOS<T>(x: T, y: T): T {
  if (navigator.platform === "MacIntel") {
    return y;
  } else {
    return x;
  }
}

export function format(shortcut: Shortcut) {
  function formatKey(key: string) {
    if (key === "ArrowRight") return "Right";
    else if (key === "ArrowDown") return "Down";
    else if (key === "ArrowLeft") return "Left";
    else if (key === "ArrowUp") return "Up";
    else if (key === "Backspace") return ifMacOS("Backspace", "Delete");
    else if (key === "Delete") return ifMacOS("Delete", "Fn+Delete");
    else return capitalize(key);
  }

  return (
    (shortcut.mod ? ifMacOS("Alt+", "Ctrl+") : "") +
    (shortcut.secondaryMod ? ifMacOS("Ctrl+", "Option+") : "") +
    (shortcut.ctrlLikeMod ? ifMacOS("Ctrl+", "Cmd+") : "") +
    formatKey(shortcut.key)
  );
}

export function matches(event: React.KeyboardEvent<{}> | KeyboardEvent, shortcut: Shortcut) {
  return (
    implies(shortcut.mod ?? false, ifMacOS(event.altKey, event.ctrlKey)) &&
    implies(shortcut.secondaryMod ?? false, ifMacOS(event.ctrlKey, event.altKey)) &&
    implies(shortcut.ctrlLikeMod ?? false, ifMacOS(event.ctrlKey, event.metaKey)) &&
    shortcut.key === event.key
  );
}

export const standard = {
  undo: {ctrlLikeMod: true, key: "z"},
  find: {mod: true, key: "f"},
  indent: {mod: true, secondaryMod: true, key: "ArrowRight"},
  unindent: {mod: true, secondaryMod: true, key: "ArrowLeft"},
  moveUp: {mod: true, secondaryMod: true, key: "ArrowUp"},
  moveDown: {mod: true, secondaryMod: true, key: "ArrowDown"},
  createChild: {mod: true, key: "Enter"},
  forceCreateSibling: {secondaryMod: true, key: "Enter"},
  removeFromParent: {mod: true, key: "Backspace"},
  delete: {mod: true, key: "Delete"},
  insertChild: {mod: true, key: "c"},
  insertParent: {mod: true, key: "p"},
  insertSibling: {mod: true, key: "s"},
  insertLink: {mod: true, key: "l"},
};
