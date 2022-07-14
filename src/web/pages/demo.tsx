import Head from "next/head";

import * as React from "react";

import DemoData from "../lib/demo-data.json";

export default function Demo() {
  const [mainElement, setMainElement] = React.useState(<div>Loading...</div>);

  React.useEffect(() => {
    import("@thinktool/client").then((Thinktool) => {
      setMainElement(
        <Thinktool.App
          remote={{
            async getFullState() {
              return DemoData;
            },
            async setContent() {},
            async deleteThing() {},
            async updateThings() {},
            async getTutorialFinished() {
              return false;
            },
            async setTutorialFinished() {},
          }}
        />,
      );
    });
  }, []);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <title>Thinktool</title>
        <link rel="icon" href="/icon.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <noscript>This web app requires JavaScript.</noscript>
      {mainElement}
      <script data-goatcounter="https://counter.thinktool.io/count" async src="//counter.thinktool.io/count.js" />
    </>
  );
}
