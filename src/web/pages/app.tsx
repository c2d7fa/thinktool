import Head from "next/head";

import * as React from "react";

export async function getStaticProps() {
  return {props: {apiHost: process.env.DIAFORM_API_HOST}};
}

export default function App(props: {apiHost: string}) {
  const [mainElement, setMainElement] = React.useState(<div>Loading...</div>);

  React.useEffect(() => {
    import("@thinktool/client").then((Thinktool) => {
      setMainElement(<Thinktool.App apiHost={props.apiHost} />);
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
      {mainElement}
      <script data-goatcounter="https://counter.thinktool.io/count" async src="//counter.thinktool.io/count.js" />
    </>
  );
}
