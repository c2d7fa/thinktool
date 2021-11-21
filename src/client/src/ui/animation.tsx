import * as React from "react";

export function useAnimation(durationMs: number): {
  setShown: () => void;
  setHidden: () => void;

  isHidden: () => boolean;
  isShown: () => boolean;
  isShowing: () => boolean;
  isHiding: () => boolean;
} {
  const [logicalState, setLogicalState] = React.useState<"hidden" | "shown">("hidden");
  const [physicalState, setPhysicalState] = React.useState<"hidden" | "showing" | "shown" | "hiding">("hidden");

  const setShown = React.useCallback(() => {
    if (logicalState === "shown") return;
    setLogicalState("shown");
    setPhysicalState("showing");
  }, [logicalState]);

  const setHidden = React.useCallback(() => {
    if (logicalState === "hidden") return;
    setLogicalState("hidden");
    setPhysicalState("hiding");
  }, [logicalState]);

  const isHidden = React.useCallback(() => physicalState === "hidden", [physicalState]);
  const isShown = React.useCallback(() => physicalState === "shown", [physicalState]);
  const isShowing = React.useCallback(() => physicalState === "showing", [physicalState]);
  const isHiding = React.useCallback(() => physicalState === "hiding", [physicalState]);

  React.useEffect(() => {
    let timeout: number | undefined;

    if (physicalState === "hidden") return;

    timeout = window.setTimeout(() => {
      if (physicalState === "showing") setPhysicalState("shown");
      else if (physicalState === "hiding") setPhysicalState("hidden");
    }, durationMs);

    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [physicalState, durationMs]);

  return {
    setShown,
    setHidden,

    isHidden,
    isShown,
    isShowing,
    isHiding,
  };
}
