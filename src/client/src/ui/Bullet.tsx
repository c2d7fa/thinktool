import * as React from "react";

import type {ItemStatus} from "../app";

function useStickyDrag(beginDrag: (ev?: React.MouseEvent<never>) => void) {
  const [down, setDown] = React.useState<boolean>(false);

  return {
    beginDrag(ev?: React.MouseEvent<never>) {
      if (ev === undefined) {
        // Touch event. We don't do anything special for those right now.
        console.log("touch drag");
        beginDrag(ev);
      } else {
        setDown(true);
      }
    },

    up(ev: React.MouseEvent<never>) {
      setDown(false);
    },

    leave(ev: React.MouseEvent<never>) {
      if (down) beginDrag(ev);
    },
  };
}

export default React.memo(function Bullet(props: {
  status: ItemStatus;
  toggle: () => void;
  beginDrag: (ev?: React.MouseEvent<never>) => void;
  onMiddleClick?(): void;
  specialType?: "parent" | "reference" | "opened-link" | "link";
}) {
  const stickyDrag = useStickyDrag(props.beginDrag);

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
    onMouseLeave: stickyDrag.leave,
    onMouseDown: (ev: React.MouseEvent<never>) => stickyDrag.beginDrag(ev),
    onMouseUp: stickyDrag.up,
    onTouchStart: (ev: React.TouchEvent<never>) => stickyDrag.beginDrag(),
    onClick: onClick,
    onAuxClick: onAuxClick,
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" {...attrs}>
      <rect className="bullet-hover-rect" x="0" y="0" width="20" height="20" rx="5" />
      {props.specialType === "parent" ? (
        <path className="bullet-circle" d="M 13,7 12,14 6,9 z" />
      ) : props.specialType === "reference" ? (
        <rect className="bullet-circle" x="4" y="7.5" width="12" height="5" rx="3" />
      ) : props.specialType === "opened-link" ? (
        <path className="bullet-circle" d="M 13,10 7,15 7,5 z" />
      ) : props.specialType === "link" ? (
        <path className="bullet-circle" d="M 13,10 7,15 7,5 z" />
      ) : (
        <circle className="bullet-circle" cx="10" cy="10" r="5" />
      )}
    </svg>
  );
});
