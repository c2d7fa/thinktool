import Head from "next/head";
import * as React from "react";

export default function StaticPage(props: {children: React.ReactNode}) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <link rel="stylesheet" href="/index.css" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="alternate"
          title="Thinktool"
          type="application/rss+xml"
          href="https://thinktool.io/blog.rss"
        />
        <script src="https://kit.fontawesome.com/d7c222beb5.js" crossOrigin="anonymous"></script>
      </Head>
      <div id="top-bar">
        <a href="/" id="logo">
          Thinktool
        </a>
        <nav>
          <a href="https://github.com/c2d7fa/thinktool">
            <i className="fab fa-github"></i>Code
          </a>
          <a href="https://reddit.com/r/thinktool">
            <i className="fab fa-reddit-alien"></i>Forum
          </a>
          <a href="/blog/">
            <i className="fas fa-newspaper"></i>Blog
          </a>
          <a href="/download.html">
            <i className="fas fa-desktop"></i>Download
          </a>
          <a href="/login.html">
            <i className="fas fa-sign-in-alt"></i>Log in
          </a>
          <a href="/demo.html" className="demo demo-small">
            <i className="fas fa-star"></i>Demo
          </a>
        </nav>
      </div>
      {props.children}
      <footer>
        Made by{" "}
        <a href="https://johv.dk/">
          <span>Jonas Hvid</span>
        </a>
        . Message me at{" "}
        <a className="email" href="mailto:jonas@thinktool.io">
          <span>jonas@thinktool.io</span>
        </a>
        .
      </footer>
      <script data-goatcounter="https://thinktool.goatcounter.com/count" async src="//gc.zgo.at/count.js" />
    </>
  );
}
