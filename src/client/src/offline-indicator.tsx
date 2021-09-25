import * as React from "react";

const style = require("./offline-indicator.module.scss").default;

export function OfflineIndicator(props: {isDisconnected: boolean}) {
  if (!props.isDisconnected) return null;
  return (
    <div className={style.offline}>
      <strong>Error:</strong> Unable to connect to server. Your changes will not be saved! Try reloading.
    </div>
  );
}
