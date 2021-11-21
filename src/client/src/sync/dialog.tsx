import * as React from "react";

const style = require("./dialog.module.scss").default;

const _deletedAmount = Symbol("deletedAmount");
const _addedAmount = Symbol("addedAmount");
const _updatedAmount = Symbol("updatedAmount");

export type SyncDialog = {[_deletedAmount]: number; [_addedAmount]: number; [_updatedAmount]: number};

export function initialize(deleted: number, added: number, updated: number): SyncDialog {
  return {
    [_deletedAmount]: deleted,
    [_addedAmount]: added,
    [_updatedAmount]: updated,
  };
}

export function SyncDialog(props: {
  dialog: SyncDialog;
  onAbort: () => void;
  onCommit: () => void;
}): React.ReactElement {
  console.log({style});
  const {onAbort: onClose, onCommit: onSync} = props;
  const deletedAmount = props.dialog[_deletedAmount];
  const addedAmount = props.dialog[_addedAmount];
  const updatedAmount = props.dialog[_updatedAmount];
  return (
    <div className={style.dialog}>
      <div className={style.content}>
        <div className={style.title}>Sync</div>
        <div className={style.text}>
          {deletedAmount} deleted, {addedAmount} added, {updatedAmount} updated
        </div>
        <div className={style.buttons}>
          <button className={style.button} onClick={onClose}>
            Cancel
          </button>
          <button className={style.button} onClick={onSync}>
            Sync
          </button>
        </div>
      </div>
    </div>
  );
}
