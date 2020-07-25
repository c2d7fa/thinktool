import * as React from "react";

export default function Bullet(props: {
  status: "expanded" | "collapsed" | "terminal";
  toggle: () => void;
  beginDrag: () => void;
  onMiddleClick?(): void;
}) {
  function onAuxClick(ev: React.MouseEvent<never>): void {
    // ev.button === 1 checks for middle click.
    if (ev.button === 1 && props.onMiddleClick !== undefined) props.onMiddleClick();
  }

  const attrs = {
    className: `bullet ${props.status}`,
    onMouseDown: props.beginDrag,
    onTouchStart: props.beginDrag,
    onClick: props.toggle,
    onAuxClick: onAuxClick,
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" {...attrs}>
      <rect className="bullet-hover-rect" x="0" y="0" width="20" height="20" rx="5" />
      <circle className="bullet-circle" cx="10" cy="10" r="5" />
    </svg>
  );
}
