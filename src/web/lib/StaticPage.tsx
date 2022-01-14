import Head from "next/head";
import * as React from "react";
import {DemoLinkButton, IconLinkButton, NavigationLink} from "./links";

const styles = require("./StaticPage.module.scss");

export default function StaticPage(props: {children: React.ReactNode}) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <link rel="stylesheet" href="/index.css" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="alternate" title="Thinktool" type="application/rss+xml" href="https://thinktool.io/blog.rss" />
      </Head>
      <div className={styles.topBar}>
        <a href="/" className={styles.logo}>
          Thinktool
        </a>
        <nav>
          <NavigationLink href="https://github.com/c2d7fa/thinktool" icon="sourceCode" label="Source" />
          <NavigationLink href="https://reddit.com/r/thinktool" icon="forum" label="Forum" />
          <NavigationLink icon="blog" href="/blog/" label="Blog" />
          <NavigationLink icon="download" href="/download.html" label="Download" />
          <NavigationLink icon="login" href="/login.html" label="Login" />
          <DemoLinkButton href="/demo.html" />
        </nav>
      </div>
      {props.children}
      <footer>
        Made by{" "}
        <a className="external-link" href="https://johv.dk/">
          <span>Jonas Hvid</span>
        </a>
        . Message me at{" "}
        <a className="external-link email" href="mailto:jonas@thinktool.io">
          <span>jonas@thinktool.io</span>
        </a>
        .
      </footer>
      <script data-goatcounter="https://thinktool.goatcounter.com/count" async src="//gc.zgo.at/count.js" />
    </>
  );
}
