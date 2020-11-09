import Head from "next/head";

import * as React from "react";

export default function Index() {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <title>Thinktool, an associative note-taking app.</title>
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
          <a href="/blog/index.html">
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
      <main>
        <div className="block small centered">
          <h1 className="bullet">A tool for taking associative notes</h1>

          <p>
            Thinktool's <em>associative note-taking</em> makes interconnected notes simple to explore. Freely
            connect related notes together with bidirectional links, or organize notes into loose outlines
            with multiple parents. Thinktool is the right tool for understanding complex topics.
          </p>

          <div className="video">
            <div className="video-embed">
              <iframe
                src="https://www.youtube.com/embed/OOOLju8vaQU"
                frameBorder="0"
                allowFullScreen></iframe>
            </div>
          </div>
        </div>

        <div className="block wide centered">
          <div className="horizontal features">
            <div className="feature feature-multiple-parents">
              <div className="description">
                <h1 className="bullet">Multiple Parents</h1>
                <p>
                  Any outliner lets you organize your notes into a hierarchy, but sometimes it's hard to
                  choose where a note belongs. With multiple parents, you can add the same notes to multiple
                  topics, and Thinktool will keep everything in sync.
                </p>
              </div>
              <div className="screenshot">
                <img src="/feature-parents.png" />
              </div>
            </div>

            <div className="feature">
              <div className="description">
                <h1 className="bullet">Bidirectional Links</h1>
                <p>
                  Use bidirectional links to associate related notes. When you type a link, Thinktool will
                  automatically add a link in the other direction. They let you quickly connect related items
                  while writing. You can always come back later and add more structure.
                </p>
              </div>
              <div className="screenshot">
                <img src="/feature-links.png" />
              </div>
            </div>

            <div className="feature">
              <div className="description">
                <h1 className="bullet">Seamless Exploration</h1>
                <p>
                  Most notes only make sense in context. With Thinktool, you can see references and other
                  parents right there in the outline &ndash; even references and other parents. Of course, you
                  can still jump between items if you need to.
                </p>
              </div>
              <div className="screenshot">
                <img src="/feature-explore.png" />
              </div>
            </div>
          </div>
        </div>

        <div className="block edge newsletter-outer">
          <div className="small centered newsletter">
            <div>
              <h1>Stay updated.</h1>
              <p>
                Receive monthlyish updates about new features and get a look behind the scenes at Thinktool by
                subscribing to the newsletter.
              </p>
            </div>
            <form action="{{apiUrl}}/newsletter/subscribe" method="POST">
              <input type="email" name="email" required placeholder="you@example.com" />
              <input type="submit" value="Subscribe" />
            </form>
          </div>
        </div>

        <div className="block horizontal flip-900">
          <div className="box small">
            <h1 className="bullet">About Thinktool</h1>
            <p>
              Thinktool is my side project. I'm currently using it as my main note-taking app, but it may
              still be buggy and unstable.
            </p>
            <p>
              I'm{" "}
              <a href="https://github.com/c2d7fa/thinktool/commits/master">
                <span>actively working on Thinktool</span>
              </a>
              . It may become a paid service in the future (aiming for &le;$5/mo.), but currently you can use
              it for free.{" "}
              <a href="/login.html">
                <span>Sign up here.</span>
              </a>
            </p>
            <p>
              I'm also working on an offline app for Thinktool. You can{" "}
              <a href="/download.html">
                <span>download a early prototype</span>
              </a>
              .
            </p>
          </div>

          <div className="box small">
            <h1 className="bullet">Alternatives</h1>

            <p>
              Thinktool is directly inspired by outliners like
              <a href="https://orgmode.org/" rel="nofollow" className="external-app-link">
                <span>Org mode</span>
              </a>
              ,
              <a href="https://workflowy.com/" rel="nofollow" className="external-app-link">
                <span>Workflowy</span>
              </a>{" "}
              and
              <a href="https://dynalist.io/" rel="nofollow" className="external-app-link">
                <span>Dynalist</span>
              </a>
              . The difference is that Thinktool lets you put one item in multiple places, so you're not
              limited to a hierarchy.
            </p>

            <p>
              <a href="https://roamresearch.com/" rel="nofollow" className="external-app-link">
                <span>Roam Research</span>
              </a>
              is another associative note-taking application, and it's much more polished than Thinktool. Roam
              supports bidirectional linking like Thinktool, but it doesn't have support for multiple parents.
            </p>
          </div>
        </div>
      </main>

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
