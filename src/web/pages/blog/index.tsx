import Head from "next/head";
import * as React from "react";

import StaticPage from "../../lib/StaticPage";

export default function RecoverAccount() {
  return (
    <StaticPage>
      <Head>
        <title>Thinktool &ndash; Blog</title>
      </Head>
      <main>
        <div className="block small centered">
          <h1>Posts</h1>
          <p>
            Consider subscribing to the{" "}
            <a href="https://thinktool.io/blog.rss">
              <span>RSS feed</span>
            </a>{" "}
            to be notified about new posts as they are published.
          </p>
          <ul className="posts">
            <li>
              <a href="/blog/newsletter-october-2020.html" className="post newsletter-post">
                <h1>Newsletter</h1>
                <time dateTime="2020-10-30">October 30th, 2020</time>
                <p>Quick update about new UI improvements.</p>
              </a>
            </li>
            <li>
              <a href="/blog/newsletter-july-2020.html" className="post newsletter-post">
                <h1>Newsletter</h1>
                <time dateTime="2020-07-13">July 13th, 2020</time>
                <p>News about the offline version, and what I'll be working on next.</p>
              </a>
            </li>
            <li>
              <a href="/blog/zettelkasten-principles.html" className="post">
                <time dateTime="2020-06-08">June 8th, 2020</time>
                <h1>Taking better notes with principles from the Zettelkasten method.</h1>
                <p>
                  Three rules &ndash; inspired by Niklas Luhmann's Zettelkasten &ndash; that you can apply to take
                  better notes.
                </p>
              </a>
            </li>
            <li>
              <a href="/tutorial.html" className="post">
                <time dateTime="2020-06-05">June 5th, 2020</time>
                <h1>How to take notes with Thinktool.</h1>
                <p>
                  Tutorial that shows you how to get started with Thinktool, and gives some tips about note-taking
                  in the process.
                </p>
              </a>
            </li>
            <li>
              <a href="/blog/newsletter-may-2020.html" className="post newsletter-post">
                <h1>Newsletter</h1>
                <time dateTime="2020-05-17">May 17th, 2020</time>
                <p>How I'm working on Thinktool, the upcoming desktop version, and a few new features.</p>
              </a>
            </li>
          </ul>
        </div>
      </main>{" "}
    </StaticPage>
  );
}
