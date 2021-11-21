import * as React from "react";
import {IconLabel} from "./ui/icons";

const style = require("./offline-indicator.module.scss").default;

export function OfflineIndicator(props: {isDisconnected: boolean}) {
  if (!props.isDisconnected) return null;
  return (
    <div className={style.offline}>
      <IconLabel icon="offline">
        <strong>Disconnected.</strong>
        <span>Your changes aren't being saved.</span>
      </IconLabel>
    </div>
  );
}
