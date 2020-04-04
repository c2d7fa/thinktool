import * as React from "react";

export default function ToggleButton(props: {
  leftLabel: string;
  rightLabel: string;
  chooseLeft: () => void;
  chooseRight: () => void;
}) {
  const [active, setActive] = React.useState<"left" | "right">("left");
  return (
    <span className="toggle-button">
      <button
        onClick={() => {
          props.chooseLeft();
          setActive("left");
        }}
        className={active === "left" ? "active-toggle" : undefined}
      >
        {props.leftLabel}
      </button>
      <button
        onClick={() => {
          props.chooseRight();
          setActive("right");
        }}
        className={active === "right" ? "active-toggle" : undefined}
      >
        {props.rightLabel}
      </button>
    </span>
  );
}
