import * as React from "react";

export default function Bullet(props: {
  status: "expanded" | "collapsed" | "terminal";
  toggle: () => void;
  beginDrag: (ev?: React.MouseEvent<never>) => void;
  onMiddleClick?(): void;
  specialType?: "parent" | "reference" | "opened-link" | "link";
}) {
  function onClick(ev: React.MouseEvent<never>): void {
    // Shift-click acts like middle click.
    if (ev.shiftKey && props.onMiddleClick !== undefined) {
      props.onMiddleClick();
    } else {
      props.toggle();
    }
  }

  function onAuxClick(ev: React.MouseEvent<never>): void {
    // ev.button === 1 checks for middle click.
    if (ev.button === 1 && props.onMiddleClick !== undefined) props.onMiddleClick();
  }

  const attrs = {
    className: `bullet ${props.status}${
      props.specialType === "parent"
        ? " parent-bullet"
        : props.specialType === "reference"
        ? " reference-bullet"
        : props.specialType === "opened-link"
        ? " opened-link-bullet"
        : props.specialType === "link"
        ? " link-bullet"
        : ""
    }`,
    onMouseDown: (ev: React.MouseEvent<never>) => props.beginDrag(ev),
    onTouchStart: (ev: React.TouchEvent<never>) => props.beginDrag(),
    onClick: onClick,
    onAuxClick: onAuxClick,
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" {...attrs}>
      <rect className="bullet-hover-rect" x="0" y="0" width="20" height="20" rx="5" />
      {props.specialType === "parent" ? (
        <path className="bullet-circle" d="M 10,7 13,12 7,12 z" />
      ) : props.specialType === "reference" ? (
        <rect className="bullet-circle" x="5" y="8" width="10" height="4" rx="2" />
      ) : props.specialType === "opened-link" ? (
        <path className="bullet-circle" d="M 12,10 7,13 7,7 z" />
      ) : props.specialType === "link" ? (
        <path className="bullet-circle" d="M 12,10 7,13 7,7 z" />
      ) : (
        <circle className="bullet-circle" cx="10" cy="10" r="5" />
      )}
    </svg>
  );
}
