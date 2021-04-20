import Head from "next/head";

import * as React from "react";
import * as Thinktool from "@thinktool/client";

export async function getStaticProps() {
  return {props: {apiHost: process.env.DIAFORM_API_HOST}};
}

export default function App(props: {apiHost: string}) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <title>Thinktool</title>
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="prefetch" href="https://thinktool.io/splash-welcome.png" />
        <link rel="prefetch" href="https://thinktool.io/splash-bidirectional-links.svg" />
        <link rel="prefetch" href="https://thinktool.io/splash-multiple-parents.svg" />
        <link rel="stylesheet" href="/app.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://kit.fontawesome.com/d7c222beb5.js" crossOrigin="anonymous" />
      </Head>
      {process.browser && <Thinktool.User apiHost={props.apiHost} />}
      <script data-goatcounter="https://thinktool.goatcounter.com/count" async src="//gc.zgo.at/count.js" />
    </>
  );
}
