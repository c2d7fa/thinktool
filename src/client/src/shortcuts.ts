import * as React from "react";

export type Shortcut =
  | {mod?: boolean; secondaryMod?: boolean; ctrlLikeMod?: boolean; key: string}
  | {special: string} // Matching is handled elsewhere; just store description.
  | null;

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

export function format(shortcut: Shortcut): string {
  if (shortcut === null) return "";

  function formatKey(key: string) {
    if (key === "ArrowRight") return "Right";
    else if (key === "ArrowDown") return "Down";
    else if (key === "ArrowLeft") return "Left";
    else if (key === "ArrowUp") return "Up";
    else if (key === "Backspace") return ifMacOS("Backspace", "Delete");
    else if (key === "Delete") return ifMacOS("Delete", "Fn+Delete");
    else return capitalize(key);
  }

  if ("special" in shortcut) {
    return shortcut.special;
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
    shortcut !== null &&
    !("special" in shortcut) &&
    implies(shortcut.mod ?? false, ifMacOS(event.altKey, event.ctrlKey)) &&
    implies(shortcut.secondaryMod ?? false, ifMacOS(event.ctrlKey, event.altKey)) &&
    implies(shortcut.ctrlLikeMod ?? false, ifMacOS(event.ctrlKey, event.metaKey)) &&
    shortcut.key === event.key
  );
}
