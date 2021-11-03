import * as React from "react";

import {ServerApi} from "../sync/server-api";
import * as ExportRoam from "../export-roam";

import {ExternalLink} from "./ExternalLink";
import {transformFullStateResponseIntoState} from "../data";

export default function UserPage(props: {server: ServerApi}) {
  const [username, setUsername] = React.useState<string | null>(null);
  const [emailField, setEmailField] = React.useState<string>("(Loading...)");
  const [passwordField, setPasswordField] = React.useState<string>("");

  React.useEffect(() => {
    props.server.getUsername().then((username) => setUsername(username));
    props.server.getEmail().then((email) => setEmailField(email));
  }, []);

  return (
    <div id="user">
      <div>
        You are <strong>{username}</strong>.
      </div>
      <hr />
      <div>
        <input value={emailField} onChange={(ev) => setEmailField(ev.target.value)} />
        <button
          onClick={async () => {
            await props.server.setEmail(emailField);
            window.location.reload();
          }}
        >
          Change email
        </button>
      </div>
      <div>
        <input value={passwordField} onChange={(ev) => setPasswordField(ev.target.value)} type="password" />
        <button
          onClick={async () => {
            await props.server.setPassword(passwordField);
            window.location.reload();
          }}
        >
          Change password
        </button>
      </div>
      <hr />
      <button
        onClick={async () => {
          if (confirm("Are you sure you want to PERMANENTLY DELETE YOUR ACCOUNT AND ALL YOUR DATA?")) {
            if (username) {
              await props.server.deleteAccount(username);
              window.location.href = "/";
            }
          }
        }}
      >
        Delete account and all data
      </button>
      <hr />
      <div>
        <h1>Export to Roam</h1>
        <p>
          Click the button below to download a file that can be imported into{" "}
          <ExternalLink href="https://roamresearch.com/">Roam Research</ExternalLink>. To import it, select{" "}
          <b>Import Files</b> in the top-right menu inside Roam.
        </p>
        <p>
          All your notes will be imported to a single page, because Roam does not let you have multiple pages with
          the same name. (So some documents that are valid in Thinktool would not be in Roam.) Additionally, items
          with multiple parents will turn into "embedded" content inside Roam. This is because Roam cannot
          represent an item with multiple parents, unlike Thinktool.
        </p>
        <button
          onClick={async () => {
            // https://stackoverflow.com/questions/45831191/generate-and-download-file-from-js
            function download(filename: string, text: string) {
              const element = document.createElement("a");
              element.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
              element.download = filename;
              element.style.display = "none";
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }

            const state = transformFullStateResponseIntoState(await props.server.getFullState());
            download("thinktool-export-for-roam.json", ExportRoam.exportString(state));
          }}
        >
          Download data for importing into Roam
        </button>
      </div>
    </div>
  );
}
