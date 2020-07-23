import * as React from "react";

// I don't think "splash screen" is exactly the right terminology for this. It's
// the thing that pops up when a user first logs in and explains a bit about our
// features and how to get started.

export default function Splash(props: {splashCompleted(): void}) {
  const pages = [page1, page2, page3];
  const [currentPageIndex, setCurrentPageIndex] = React.useState<number>(0);
  const currentPage = pages[currentPageIndex];

  const isFirst = currentPageIndex === 0;
  const isLast = currentPageIndex === pages.length - 1;

  function goToPrevious() {
    setCurrentPageIndex(currentPageIndex - 1);
  }

  function goToNext() {
    if (isLast) return props.splashCompleted();
    setCurrentPageIndex(currentPageIndex + 1);
  }

  return (
    <div className="splash-outer">
      <div className="splash-main">
        {currentPage}
        <div className="splash-nav">
          <button onClick={() => goToPrevious()} disabled={isFirst}>
            Back
          </button>
          <button className="suggested-button" onClick={() => goToNext()}>
            {isLast ? "Start Tutorial" : isFirst ? "Learn More" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

const page1 = (
  <>
    <div className="splash-image">
      <img
        src="/splash-welcome.png"
        style={{display: "block", width: "75%", height: "100%", objectFit: "cover", margin: "auto"}}
      />
    </div>
    <h1>Welcome to Thinktool</h1>
    <p>
      With multiple parents and bidirectional linking, you'll spend your time <em>writing</em> notes, not
      organizing them.
    </p>
  </>
);

const page2 = (
  <>
    <div className="splash-image"></div>
    <h1>Multiple parents</h1>
    <p>
      Items can have multiple parents, so you can put each item everywhere it belongs. Thinktool keeps
      everything in sync.
    </p>
  </>
);

const page3 = (
  <>
    <div className="splash-image">
      <img src="/splash-bidirectional-links.svg" />
    </div>
    <h1>Bidirectional links</h1>
    <p>
      Use links to associate related items. Thinktool will find and collect references to each of the items in
      your library.
    </p>
  </>
);
