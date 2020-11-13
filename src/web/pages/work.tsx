import Head from "next/head";
import * as React from "react";

import StaticPage from "../lib/StaticPage";

export default function Work() {
  return (
    <StaticPage>
      <Head>
        <title>Thinktool &ndash; Behind the scenes</title>
      </Head>

      <main>
        <div className="block small box centered">
          <p>
            Hi there! This page used to contain a list of tasks that I was currently working on. Turns out, it
            takes a lot of effort to keep it updated, so I decided not to do that anymore.
          </p>
          <p>
            However, you can find Thinktool's source code, as well as a history of all changes made, at{" "}
            <a href="https://github.com/c2d7fa/thinktool">
              <span>c2d7fa/thinktool on GitHub</span>
            </a>
            .
          </p>
          <p>
            You can also click on "Updates" on the toolbar inside the app itself to see a list of recent
            changes.
          </p>
        </div>
      </main>
    </StaticPage>
  );
}
