import Head from "next/head";
import * as React from "react";

import StaticPage from "../lib/StaticPage";

export async function getStaticProps() {
  return {
    props: {
      apiHost: process.env.DIAFORM_API_HOST,
      assetsHost: process.env.THINKTOOL_ASSETS_HOST ?? "https://thinktool.io",
      generatedTime: Date.now(),
    },
  };
}

function Timestamp(props: { date: Date }) {
  const year = props.date.getUTCFullYear().toString();
  const monthName = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][props.date.getUTCMonth()];
  const day = props.date.getUTCDate().toString();

  return (
    <time dateTime={props.date.toISOString()}>
      {monthName} {day}, {year}
    </time>
  );
}

export default function Download(props: { apiHost: string; assetsHost: string; generatedTime: number }) {
  return (
    <StaticPage>
      <Head>
        <title>Thinktool &ndash; Desktop Client</title>
      </Head>

      <main>
        <div className="block small centered">
          <h1>Desktop application for Thinktool</h1>

          <p>
            I'm working on creating an offline desktop app for Thinktool. With this, you can be confident that your
            data is totally private and secure.
          </p>
        </div>

        <div className="block edge newsletter-outer">
          <div className="small centered newsletter">
            <div>
              <h1>Get notified when the desktop client is ready.</h1>
              <p>
                Receive occasional news about major updates by subscribing to the newsletter below. You can
                unsubscribe at any time.
              </p>
            </div>
            <form action={`${props.apiHost}/newsletter/subscribe`} method="POST">
              <input type="email" name="email" required placeholder="you@example.com" />
              <input type="submit" value="Subscribe" />
            </form>
          </div>
        </div>

        <div className="block box small centered">
          <p>
            The current version is a <strong>prototype intended purely for testing</strong>. If you use this, you
            may lose your data. It is not currently possible to synchronize your data in the desktop client to the
            online version, and it may never be (from the current version, that is)!
          </p>
          <p>
            Download it for Linux or Windows from GitHub:{" "}
            <a href={`https://github.com/c2d7fa/thinktool/releases/latest`} download className="external-link">
              <span>Latest release</span>
            </a>
          </p>
          <p>
            For <strong>Linux</strong>, just make the downloaded AppImage executable with{" "}
            <code>chmod +x &lt;FILENAME&gt;</code> and then run it.
          </p>
          <p>
            The <strong>Windows</strong> version is a so-called portable executable, so you don't need to install
            anything &ndash; just run it.
          </p>
          <p>Currently, no macOS version is available</p>
          <p>
            <i>
              Last updated <Timestamp date={new Date(props.generatedTime)} />.
            </i>
          </p>
        </div>
      </main>
    </StaticPage>
  );
}
