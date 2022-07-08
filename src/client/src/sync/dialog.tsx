import * as React from "react";

import * as Sync from ".";
import {Send} from "../app";

import {Animated, useSticky} from "../ui/animation";
const style = require("./dialog.module.scss").default;

const _local = Symbol("local");
const _remote = Symbol("remote");

export type SyncDialog = {[_local]: Sync.StoredState; [_remote]: Sync.StoredState};

export function initialize({local, remote}: {local: Sync.StoredState; remote: Sync.StoredState}): SyncDialog {
  return {
    [_local]: local,
    [_remote]: remote,
  };
}

function summary(dialog: SyncDialog): {deleted: number; updated: number; edited: number} {
  const local = dialog[_local];
  const remote = dialog[_remote];

  const changes = Sync.changes(remote, local);

  return {
    deleted: changes.deleted.length,
    updated: changes.updated.length,
    edited: changes.edited.length,
  };
}

export function storedStateAfter(dialog: SyncDialog, option: "commit" | "abort"): Sync.StoredState {
  return option === "commit" ? dialog[_local] : dialog[_remote];
}

export function SyncDialog(props: {dialog: SyncDialog | null; send: Send}) {
  const inner = useSticky(() => {
    if (props.dialog === null) return null;

    const {deleted, updated, edited} = summary(props.dialog);

    function Changes(props: {amount: number}) {
      return <strong className={props.amount !== 0 ? style.destructive : ""}>{props.amount} items</strong>;
    }

    return (
      <div className={style.dialog}>
        <div className={style.content}>
          <h1>Reconnected</h1>
          <p>
            Connection to the server was re-established. Do you want to push the local state to the server, keeping
            the local state but overriding remote changes?
          </p>
          <p>
            If you choose to push the local state, it will delete <Changes amount={deleted} />, reset connections
            of <Changes amount={updated} />, and change the content of <Changes amount={edited} />. After pushing,
            the state on the server will match the state on this client.
          </p>
          <hr />
          <div className={style.buttons}>
            <button
              className={[style.button, style.cancel].join(" ")}
              onClick={() => props.send({type: "syncDialogSelect", option: "abort"})}
            >
              Keep Remote
            </button>
            <button
              className={[style.button, style.sync].join(" ")}
              onClick={() => props.send({type: "syncDialogSelect", option: "commit"})}
            >
              Push Local
            </button>
          </div>
        </div>
      </div>
    );
  }, [props.dialog, props.send]);

  return (
    <Animated durationMs={500} isHidden={props.dialog === null} classes={style}>
      <div className={style.container}>{inner}</div>
    </Animated>
  );
}
