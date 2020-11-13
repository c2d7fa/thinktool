import Head from "next/head";
import BlogPage from "../lib/BlogPage";

export default function BlogPostZettelkastenPrinciples() {
  return (
    <BlogPage>
      <Head>
        <title>Tutorial: How to take notes with Thinktool</title>
      </Head>
      <article>
        <h1>How to take notes with Thinktool</h1>
        <div className="last-updated">
          Published <time dateTime="2020-06-05">June 5th, 2020</time>.
        </div>
        <p>There are many ways to take notes.</p>
        <p>
          Thinktool is an associative note-taking application designed to hold an evolving library of notes.
          You may be used to taking notes once, and then throwing those notes away. In contrast, Thinktool is
          designed for notes that continually change, grow, and improve as you learn.
        </p>
        <p>
          In Thinktool, you grow your library by building connections between different notes. The smallest
          element that you can link to is simply called an <i>item</i>. It looks like this:
        </p>
        <img src="/tutorial1.png" width="587" height="68" />
        <p>
          An item can represent a topic, a note, a person, an object, or anything else that you may want to
          write about. Items should be as small as possible to make your links as specific as possible.
        </p>
        <p>
          Create a new item by clicking the <i className="button">New</i> button on the toolbar. Then, write
          some notes that you want to keep in your library.
        </p>
        <p>
          As you're writing, press <kbd>Alt+L</kbd> (or <kbd>Ctrl+L</kbd> on macOS) to insert links to any
          important concepts or words. (We'll come back to links in a bit.) Links are showed with a bullet
          next to them.
        </p>
        <img src="/tutorial2.png" width="588" height="113" />
        <p>
          Links are the most general way to structure notes, but they're not the only way. Sometimes, an item
          may fit better
          <em>inside</em> another item. Try to organize your notes into a tree with the{" "}
          <i className="button">Unindent</i>, <i className="button">Indent</i>, <i className="button">Up</i>{" "}
          and <i className="button">Down</i> buttons on the toolbar.
        </p>
        <img src="/tutorial3.png" width="604" height="168" />
        <p>
          Did you create some links? Try to click on the bullet next to a link, and notice how the linked item
          is opened underneath.
        </p>
        <p>
          In Thinktool, links are <em>bidirectional</em>. This means that everytime you link to an item,
          Thinktool automatically adds a reference in the other direction. You can find all the references to
          an item under
          <i>References</i> inside the linked item.
        </p>
        <img src="/tutorial4.png" width="562" height="198" />
        <p>
          One of the unique features of Thinktool is that you're not limited to organizing notes in a strict
          hierarchy.
        </p>
        <p>
          Of course, links let you freely connect different notes together, like in other tools such as{" "}
          <a href="https://roamresearch.com/" rel="nofollow">
            <span>Roam Research</span>
          </a>{" "}
          or{" "}
          <a href="https://obsidian.md/" rel="nofollow">
            <span>Obsidian</span>
          </a>
          .
        </p>
        <p>
          However, Thinktool goes one step further, by allowing each note to have multiple parents. This lets
          you freely build up a "loose hierarchy" of notes, without needing to worry about where each
          individual note belongs.
        </p>
        <p>
          To make use of this feature, <i className="toolbar-heading">connect</i> two existing items. You can
          do this with the
          <i className="button">Sibling</i>, <i className="button">Child</i> or{" "}
          <i className="button">Parent</i> buttons in the toolbar. Start typing the content of an existing
          item, and then select that item in the popup.
        </p>
        <img src="/tutorial5.png" width="610" height="345" />
        <p>
          In the same way that Thinktool automatically collects all references to a given item, it will also
          show you all the parents of an item.
        </p>
        <img src="/tutorial6.png" width="611" height="207" />
        <p>
          When thinking about where to put a item, ask yourself this:{" "}
          <em>In which context would I want to be reminded of this item?</em> Put your items where you want to
          see them. Since Thinktool has bidirectcional links, creating a link between two items means that you
          will be reminded of one item when looking at the other and vice versa.
        </p>
        <p>
          The point of taking notes isn't to have a complete repository of all possible knowledge. That
          already exists, and it's called Google. The point of note-taking is to build a curated library of
          information that is relevant to you, expressed in a way that makes sense to you.
        </p>
        <p>In order to achieve this, it's critical that you regularly revisit your notes.</p>
        <p>
          You should be going back and getting rid of notes or connections that are no longer relevant. Use{" "}
          <i className="button">Remove</i> to remove an item from its parent, and use{" "}
          <i className="button">Destroy</i> to permanently delete that item from the database, removing it
          from all of its parents.
        </p>
        <p>
          Taking notes is the process of turning abstract thoughts into a tangible product. It's like writing,
          but more personal. This is not a trivial task, and you need to put in real effort over a long period
          of time to get good notes.
        </p>
      </article>
    </BlogPage>
  );
}
