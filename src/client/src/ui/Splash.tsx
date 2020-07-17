import * as React from "react";

// I don't think "splash screen" is exactly the right terminology for this. It's
// the thing that pops up when a user first logs in and explains a bit about our
// features and how to get started.

export default function Splash(props: {splashCompleted(): void}) {
  const pages = [page1, page2];
  const [currentPageIndex, setCurrentPageIndex] = React.useState<number>(0);
  const currentPage = pages[currentPageIndex]

  const hasPrevious = currentPageIndex !== 0
  const isLast = currentPageIndex === pages.length - 1

  function goToPrevious() {
    setCurrentPageIndex(currentPageIndex - 1)
  }

  function goToNext() {
    if (isLast) return props.splashCompleted()
    setCurrentPageIndex(currentPageIndex + 1)
  }

  return (
    <div className="splash-outer">
      <div className="splash-main">
        {currentPage}
        <div className="splash-nav">
          <button onClick={() => goToPrevious()} disabled={!hasPrevious}>Back</button>
          <button className="suggested-button" onClick={() => goToNext()}>{isLast ? "Continue" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}

const page1 = (
  <>
    <h1>Page 1</h1>
    <p>This is the first page of this so-called splash screen.</p>
  </>
);

const page2 = (
  <>
    <h1>Page 2</h1>
    <p>This is the second page of this so-called splash screen.</p>
  </>
);
