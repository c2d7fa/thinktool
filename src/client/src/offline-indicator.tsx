import * as React from "react";

import {IconLabel} from "./ui/icons";
import {Animated} from "./ui/animation";

const style = require("./offline-indicator.module.scss").default;

export function OfflineIndicator(props: {isDisconnected: boolean}) {
  return (
    <Animated
      durationMs={500}
      isHidden={!props.isDisconnected}
      classes={{showing: style.showing, hiding: style.hiding}}
    >
      <div className={style.offline}>
        <IconLabel icon="offline">
          <strong>Disconnected.</strong>
          <span>Your changes aren't being saved.</span>
        </IconLabel>
      </div>
    </Animated>
  );
}
