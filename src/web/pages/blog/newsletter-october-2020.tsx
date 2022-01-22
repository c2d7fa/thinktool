import Head from "next/head";
import BlogPage from "../../lib/BlogPage";

export async function getStaticProps() {
  return {props: {apiHost: process.env.DIAFORM_API_HOST}};
}

export default function BlogPostNewsletterOctober2020(props: {apiHost: string}) {
  return (
    <BlogPage apiHost={props.apiHost}>
      <Head>
        <title>Thinktool Newsletter for October 2020</title>
      </Head>
      <article>
        <h1>Thinktool Newsletter for October 2020</h1>
        <div className="last-updated">
          Published <time dateTime="2020-10-30">October 30th, 2020</time>.
        </div>

        <p>
          Hey everyone, and welcome to the newsletter for{" "}
          <a href="/">
            <span>Thinktool</span>
          </a>
          . In case you've forgotten, Thinktool is an associative note-taking app. It uses bidirectional links
          and multiple parents to represent a graph of notes as a seamless outline.
        </p>

        <p>
          I've been trying to send these newsletters out roughly once a month. The last one was in July. Oops.
          But hey, I've actually made some good progress on Thinktool &ndash; I just haven't really been
          writing about it.
        </p>

        <h2>Thinking should be fun</h2>

        <p>
          <a href="/blog/newsletter-july-2020">
            <span>In the last newsletter</span>
          </a>
          , I wrote that I wanted to focus on making Thinktool easier to learn and more pleasant to use. I
          want to make thinking fun: It should feel good to write your ideas down in Thinktool and use its
          features to connect them with each other.
        </p>

        <p>
          To achieve this, I've been focusing hard on reducing friction in the user interface. This comes down
          to making lots of tiny improvements that add up to a more polished experience overall. Here are a
          some of the improvements I've made since last time:
        </p>

        <ul>
          <li>
            When you wanted to edit an item, you previously had to click twice; now you can just click on an
            item and start typing - as you would expect.
          </li>
          <li>
            There was a bug where inserting a link with would unfocus the item so you had to click it again.
            Inserting links now also works as expected.
          </li>
          <li>
            Links to other items would be displayed as special codes (like <code>#q9nsqefl</code>) when
            editing an item; now they're displayed nicely in-line.
          </li>
          <li>
            I added basic fuzzy search, so you don't have to remember the exact title of an item that you want
            to link or add as a child.
          </li>
          <li>
            The layout of parents and references in the outline have been changed, so they're hopefully more
            intuitive. For example, other parents are now displayed in a little box above the item, and the
            different connection types (like parents and references) have unique bullet graphics.
          </li>
          <li>Overhauled the typography and added icons.</li>
        </ul>

        <p>
          I also mentioned in the last newsletter that I wanted to focus on the tutorial and documentation.
          This is something that I still haven't gotten around to, but it's among the things I'm working on
          now. Thanks to the people who've sent their feedback about the current tutorial!
        </p>

        <h2>Now on Reddit and GitHub</h2>

        <p>
          Thinktool now has{" "}
          <a href="https://reddit.com/r/thinktool">
            <span>its own subreddit</span>
          </a>
          . It's pretty sparse for now, but if you post a question there I'll do my best to respond.
        </p>

        <p>
          I've also decided to make the{" "}
          <a href="https://github.com/c2d7fa/thinktool">
            <span>source code for Thinktool available on GitHub</span>
          </a>
          . To be clear, Thinktool isn't actually open source yet. However, I plan to make Thinktool properly
          open source in the future, so you can run your own instance or even develop it yourself if I stopped
          working on it.
        </p>
      </article>
    </BlogPage>
  );
}
