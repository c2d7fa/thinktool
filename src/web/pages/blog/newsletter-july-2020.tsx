import Head from "next/head";
import BlogPage from "../../lib/BlogPage";

export async function getStaticProps() {
  return {props: {apiHost: process.env.DIAFORM_API_HOST}};
}

export default function BlogPostNewsletterJuly2020(props: {apiHost: string}) {
  return (
    <BlogPage apiHost={props.apiHost}>
      <Head>
        <title>Thinktool Newsletter for July 2020</title>
      </Head>
      <article>
        <h1>Thinktool Newsletter for July 2020</h1>
        <div className="last-updated">
          Published <time dateTime="2020-07-13">July 13th, 2020</time>.
        </div>

        <p>Hi. Thanks for subscribing to this newsletter about Thinktool, an associative note-taking app!</p>

        <h2>Offline?</h2>
        <p>
          Your notes should be accessible anywhere, even when you're offline. So why did I decide to make
          Thinktool an online service? Excellent question — please allow me to deflect that question and
          distract you with this instead: Thinktool now has an offline desktop version!
        </p>
        <p>
          That's right, you can{" "}
          <a href="https://thinktool.io/download">
            <span>download Thinktool</span>
          </a>
          , and use it offline. Well, kind of. Apparently, turning a web app into an offline desktop app is
          harder than it sounds, so the current version is <em>very</em> much a work-in-progress. I wouldn't
          recommend using it for anything serious just yet.
        </p>
        <p>
          Indeed, Thinktool as a whole is a work-in-progress. I've had to balance the limited amount of time
          that I have between polishing the existing experience and adding new features. Large features like
          this desktop app take a long time. So next month I've decided to take a break from it and focus on
          improving other parts of the app instead.
        </p>

        <h2>Easy is hard</h2>
        <p>
          Thinktool has some good ideas, like mixing bidirectional linking (shamelessly stolen from Roam
          Research) with multiple parents. However, people who are new to Thinktool find it difficult to learn
          how to use it effectively. The learning curve is too steep.
        </p>
        <p>
          That's why I'm dedicating this month to softening the learning curve. I started by writing{" "}
          <a href="https://thinktool.io/blog/">
            <span>a couple of blog posts</span>
          </a>{" "}
          introducing people to Thinktool, but more importantly, I want to improve the interactive tutorial
          that starts when you first open the app.
        </p>
        <p>
          It's surprisingly hard to explain something as "simple" as Thinktool in a way that's concise,
          understandable and engaging. I'm doing my best though! Thanks to the people who've sent me their
          feedback on the current tutorial. That's been really helpful.
        </p>
        <p>
          Making Thinktool easier to learn isn't just about the tutorial. I've also implemented a couple of
          minor UI improvements, like making links more obvious and improving the search box that pops up when
          inserting a link. Oh, and I added a very basic "pages" feature, that I may or may not keep. You can
          use this to mark important items, so they stand out from other notes in the outline – like how you
          might use pages in Roam.
        </p>

        <h2>Another cool note-taking app</h2>
        <p>
          While I was looking for inspiration for UI improvements, I stumbled across another note-taking app
          that I don't see mentioned a lot. It's called{" "}
          <a href="https://supernotes.app/">
            <span>Supernotes</span>
          </a>
          , and except from Thinktool, it's the only note-taking app I know of with support for both
          bidirectional linking and multiple parents. If that sounds interesting, maybe give it a try!
        </p>
      </article>
    </BlogPage>
  );
}
