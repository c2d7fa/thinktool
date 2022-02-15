import * as React from "react";
import * as Misc from "@johv/miscjs";

export type Shortcut =
  | {mod?: boolean; secondaryMod?: boolean; ctrlLikeMod?: boolean; key: string; condition?: Condition}
  | {special: string} // Matching is handled elsewhere; just store description.
  | null;

export type Condition = "first-line" | "last-line" | "first-character" | "last-character";

function ifMacOS<T>(x: T, y: T): T {
  if (typeof navigator === "undefined") return x;
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
    else return Misc.capitalize(key);
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

export function matches(
  event: React.KeyboardEvent<{}> | KeyboardEvent,
  shortcut: Shortcut,
  activeConditions: Condition[] = [],
) {
  return (
    shortcut !== null &&
    !("special" in shortcut) &&
    Misc.implies(shortcut.mod ?? false, ifMacOS(event.altKey, event.ctrlKey)) &&
    Misc.implies(shortcut.secondaryMod ?? false, ifMacOS(event.ctrlKey, event.altKey)) &&
    Misc.implies(shortcut.ctrlLikeMod ?? false, ifMacOS(event.ctrlKey, event.metaKey)) &&
    Misc.implies(shortcut.condition !== undefined, activeConditions.includes(shortcut.condition!)) &&
    shortcut.key === event.key
  );
}
