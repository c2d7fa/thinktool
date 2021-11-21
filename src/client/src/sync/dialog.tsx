import * as React from "react";

import * as Sync from ".";

const style = require("./dialog.module.scss").default;

const _changes = Symbol("changes");

export type SyncDialog = {[_changes]: Sync.Changes};

export function initialize(changes: Sync.Changes): SyncDialog {
  return {
    [_changes]: changes,
  };
}

export function changes(dialog: SyncDialog): Sync.Changes {
  return dialog[_changes];
}

export function SyncDialog(props: {
  dialog: SyncDialog;
  onAbort: () => void;
  onCommit: () => void;
}): React.ReactElement {
  const deletedAmount = props.dialog[_changes].deleted.length;
  const updatedAmount = props.dialog[_changes].updated.length;
  const editedAmount = props.dialog[_changes].edited.length;

  return (
    <div className={style.dialog}>
      <div className={style.content}>
        <h1>Reconnected</h1>
        <p>
          Connection to the server was re-established. Do you want to push the local state to the server, keeping
          the local state but overriding remote changes?
        </p>
        <p>
          If you choose to push the local state, it will delete{" "}
          <strong className={deletedAmount !== 0 ? style.destructive : ""}>{deletedAmount} items</strong>, reset
          connections of{" "}
          <strong className={updatedAmount !== 0 ? style.destructive : ""}>{updatedAmount} items</strong>, and
          change the content of{" "}
          <strong className={editedAmount !== 0 ? style.destructive : ""}>{editedAmount} items</strong>. After
          pushing, the state on the server will match the state on this client.
        </p>
        <hr />
        <div className={style.buttons}>
          <button className={[style.button, style.cancel].join(" ")} onClick={props.onAbort}>
            Keep Remote
          </button>
          <button className={[style.button, style.sync].join(" ")} onClick={props.onCommit}>
            Push Local
          </button>
        </div>
      </div>
    </div>
  );
}
