import * as React from "react";

import {IconLabel} from "./ui/icons";
import {useAnimation} from "./ui/animation";

const style = require("./offline-indicator.module.scss").default;

export function OfflineIndicator(props: {isDisconnected: boolean}) {
  const animation = useAnimation(500);

  if (props.isDisconnected) animation.setShown();
  else animation.setHidden();

  if (animation.isHidden()) return null;

  const animationClass = animation.isShowing() ? style.showing : animation.isHiding() ? style.hiding : "";

  return (
    <div className={[style.offline, animationClass].join(" ")}>
      <IconLabel icon="offline">
        <strong>Disconnected.</strong>
        <span>Your changes aren't being saved.</span>
      </IconLabel>
    </div>
  );
}
