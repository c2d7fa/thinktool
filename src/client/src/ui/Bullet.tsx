import * as React from "react";

export default function Bullet(props: {
  status: "expanded" | "collapsed" | "terminal";
  toggle: () => void;
  beginDrag: () => void;
  onMiddleClick?(): void;
  specialType?: "parent";
}) {
  function onAuxClick(ev: React.MouseEvent<never>): void {
    // ev.button === 1 checks for middle click.
    if (ev.button === 1 && props.onMiddleClick !== undefined) props.onMiddleClick();
  }

  if (props.specialType === "parent") console.log("special parent");

  const attrs = {
    className: `bullet ${props.status}${props.specialType === "parent" ? " parent-bullet" : ""}`,
    onMouseDown: props.beginDrag,
    onTouchStart: props.beginDrag,
    onClick: props.toggle,
    onAuxClick: onAuxClick,
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" {...attrs}>
      <rect className="bullet-hover-rect" x="0" y="0" width="20" height="20" rx="5" />
      {props.specialType === "parent" ? (
        <path className="bullet-circle" d="M 10,7 13,12 7,12 z" />
      ) : (
        <circle className="bullet-circle" cx="10" cy="10" r="5" />
      )}
    </svg>
  );
}
