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
        <div className={style.title}>Sync</div>
        <div className={style.text}>
          {deletedAmount} deleted, {updatedAmount} updated, {editedAmount} edited
        </div>
        <div className={style.buttons}>
          <button className={style.button} onClick={props.onAbort}>
            Cancel
          </button>
          <button className={style.button} onClick={props.onCommit}>
            Sync
          </button>
        </div>
      </div>
    </div>
  );
}
