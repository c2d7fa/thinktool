import Head from "next/head";
import * as React from "react";

import StaticPage from "../../lib/StaticPage";

const styles = require("./blogIndex.module.scss");

function Timestamp(props: {date: Date}) {
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

  const dayNumber = props.date.getUTCDate();
  const suffix =
    dayNumber % 10 === 1 && dayNumber % 100 !== 11
      ? "st"
      : dayNumber % 10 === 2 && dayNumber % 100 !== 12
      ? "nd"
      : dayNumber % 10 === 3 && dayNumber % 100 !== 13
      ? "rd"
      : "th";
  const day = `${dayNumber}${suffix}`;

  return (
    <time dateTime={props.date.toISOString()}>
      {monthName} {day}, {year}
    </time>
  );
}

function BlogPostLink(props: {title: string; href: string; description: string; date: Date}) {
  return (
    <a href={props.href} className={styles.post}>
      <Timestamp date={props.date} />
      <h1>{props.title}</h1>
      <p>{props.description}</p>
    </a>
  );
}

function NewsletterPostLink(props: {href: string; description: string; date: Date}) {
  return (
    <a href={props.href} className={styles.newsletter}>
      <h1>Newsletter</h1>
      <Timestamp date={props.date} />
      <p>{props.description}</p>
    </a>
  );
}

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
            <a href="https://thinktool.io/blog.rss" className="external-link">
              <span>RSS feed</span>
            </a>{" "}
            to be notified about new posts as they are published.
          </p>
          <ul className={styles.posts}>
            <li>
              <NewsletterPostLink
                href="/blog/newsletter-october-2020.html"
                date={new Date("2020-10-30")}
                description="Quick update about new UI improvements"
              />
            </li>
            <li>
              <NewsletterPostLink
                href="/blog/newsletter-july-2020.html"
                date={new Date("2020-07-13")}
                description="News about the offline version, and what I'll be working on next"
              />
            </li>
            <li>
              <BlogPostLink
                href="/blog/zettelkasten-principles.html"
                date={new Date("2020-06-08")}
                title="Taking better notes with principles from the Zettelkasten method"
                description="Three rules &ndash; inspired by Niklas Luhmann's Zettelkasten &ndash; that you can apply to take better notes"
              />
            </li>
            <li>
              <BlogPostLink
                href="/tutorial.html"
                date={new Date("2020-06-05")}
                title="How to take notes with Thinktool"
                description="Tutorial that shows you how to get started with Thinktool, and gives some tips about note-taking
                in the process"
              />
            </li>
            <li>
              <NewsletterPostLink
                href="/blog/newsletter-may-2020.html"
                date={new Date("2020-05-17")}
                description="How I'm working on Thinktool, the upcoming desktop version, and a few new features"
              />
            </li>
          </ul>
        </div>
      </main>{" "}
    </StaticPage>
  );
}
