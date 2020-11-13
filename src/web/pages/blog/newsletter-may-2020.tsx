import Head from "next/head";
import BlogPage from "../../lib/BlogPage";

export async function getStaticProps() {
  return {props: {apiHost: process.env.DIAFORM_API_HOST}};
}

export default function BlogPostNewsletterMay2020(props: {apiHost: string}) {
  return (
    <BlogPage apiHost={props.apiHost}>
      <Head>
        <title>Thinktool Newsletter for May 2020</title>
      </Head>
      <article>
        <h1>Thinktool Newsletter for May 2020</h1>
        <div className="last-updated">
          Published <time dateTime="2020-05-17">May 17th, 2020</time>.
        </div>

        <p>
          Thank you for signing up for this roughly monthly newsletter for{" "}
          <a href="https://thinktool.io/">
            <span>Thinktool</span>
          </a>
          , an associative note-taking app designed to help you understand complex topics.
        </p>

        <h2>How I'm working on Thinktool</h2>
        <p>
          I've been working on Thinktool for a couple of months now. While still unpolished, I think it's
          coming along nicely, if I say so myself.
        </p>
        <p>
          Reading your feedback has been the highlight of this project so far for me. Although I've been
          programming since I was in my teens, this is my first attempt at making something for other people,
          by myself. Actually putting it out there is exciting — and a little bit scary!
        </p>
        <p>
          Although I would love to see Thinktool eventually become profitable, it's currently just a
          side-project that I'm spending 5-20 hours a week on. That's not much time, so I'm carefully
          prioritizing tasks. Feedback helps me figure out what's important and what's not. If Thinktool looks
          like something that'll eventually be useful to you, you should make sure to send me your feedback,
          so I can focus on the parts that are important to you!
        </p>

        <h2>An offline app?</h2>
        <p>
          I originally planned for Thinktool to be available only as a web app. However, I've gotten a lot of
          feedback from people that want to have their notes available offline. Given how important my notes
          are to me, I can certainly empathize with this view. In fact, an offline app is something that I
          would use myself.
        </p>
        <p>That's why I'm looking into creating an offline desktop app for Thinktool.</p>
        <p>
          This is technically quite challenging, so I've decided to do it in phases. Phase one will be to have
          a basic prototype that can do everything that the online version can do, but which saves to a local
          file. I am planning on adding login, synchronization, automatic updates, etc., etc. later on.
        </p>

        <h2>Export to Roam</h2>
        <p>
          I'm also working on other features at the same time as the offline app. One cool feature that I
          recently added is the ability to export all your notes to Roam Research. If you're worried about
          Thinktool disappearing, I hope this feature will give you some peace of mind.
        </p>
      </article>
    </BlogPage>
  );
}
