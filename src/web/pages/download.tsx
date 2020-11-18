import Head from "next/head";
import * as React from "react";

import StaticPage from "../lib/StaticPage";

export async function getStaticProps() {
  return {props: {apiHost: process.env.DIAFORM_API_HOST}};
}

export default function Download(props: {apiHost: string}) {
  return (
    <StaticPage>
      <Head>
        <title>Thinktool &ndash; Desktop Client</title>
      </Head>

      <main>
        <div className="block small centered">
          <h1>Desktop application for Thinktool</h1>

          <p>
            I'm working on creating an offline desktop app for Thinktool. With this, you can be confident that
            your data is totally private and secure.
          </p>
        </div>

        <div className="block edge newsletter-outer">
          <div className="small centered newsletter">
            <div>
              <h1>Get notified when the desktop client is ready.</h1>
              <p>
                Receive monthly updates about new features and get a look behind the scenes at Thinktool by
                subscribing to the newsletter.
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
            The current version is a <strong>pre-prototype intended purely for testing</strong>. If you use
            this, you may lose your data. It is not currently possible to synchronize your data in the desktop
            client to the online version, and it may never be (from the current version, that is)!
          </p>
          <p>
            Get it for <strong>Linux</strong> here:{" "}
            <a href="https://thinktool.io/Thinktool Desktop Prototype-202011181738.0.0.AppImage" download>
              <span>Thinktool Desktop Prototype.AppImage</span>
            </a>
            . Just make it executable with <code>chmod +x &lt;FILENAME&gt;</code> and then run it.
          </p>
          <p>
            Get it for <strong>Windows</strong> here:{" "}
            <a href="https://thinktool.io/Thinktool Desktop Prototype 202011181738.0.0.exe" download>
              <span>Thinktool Desktop Prototype .exe</span>
            </a>
            . This is a so-called portable executable, so you don't need to install anything &ndash; just run
            it.
          </p>
          <p>
            <i>
              Last updated <time dateTime="2020-11-18T17:38:58">November 18, 2020</time>.
            </i>
          </p>
        </div>
      </main>
    </StaticPage>
  );
}
