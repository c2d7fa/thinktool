import * as React from "react";

import {ExternalLink} from "./ExternalLink";
import {IconId, IconLabel} from "./icons";

import * as A from "../app";
import * as U from "../tutorial";
import * as G from "../goal";

export default function TutorialBox(props: {tutorial: U.View; send: A.Send}) {
  if (!props.tutorial.open) return null;

  return (
    <div className="tutorial">
      <h1>
        {props.tutorial.title}{" "}
        <span className="step">
          (Step {props.tutorial.currentStep} of {props.tutorial.totalSteps})
        </span>
      </h1>
      {props.tutorial.step === "Getting started" ? (
        <StepGettingStarted goals={props.tutorial.goals} />
      ) : props.tutorial.step === "Reorganizing" ? (
        <StepReorganizing goals={props.tutorial.goals} />
      ) : props.tutorial.step === "Multiple parents" ? (
        <StepFlexibleHierarchy goals={props.tutorial.goals} />
      ) : props.tutorial.step === "Bidirectional linking" ? (
        <StepBidirectionalLinks goals={props.tutorial.goals} />
      ) : props.tutorial.step === "Navigation" ? (
        <StepStayingFocused goals={props.tutorial.goals} />
      ) : props.tutorial.step === "The end" ? (
        <StepHaveFun send={props.send} />
      ) : (
        <p>An error happened while loading the tutorial!</p>
      )}
      <div className="tutorial-navigation">
        <button
          onClick={() => props.send({topic: "tutorial", type: "previous"})}
          disabled={props.tutorial.previousStepDisabled}
        >
          &lt; Back
        </button>
        <button onClick={() => props.send({topic: "tutorial", type: "next"})}>
          {props.tutorial.nextStepLabel}
        </button>
      </div>
    </div>
  );
}

function FakeButton(props: {label: string; icon: IconId}) {
  return (
    <span className="fake-button">
      <IconLabel icon={props.icon}>{props.label}</IconLabel>
    </span>
  );
}

type Goals = (U.View & {open: true})["goals"];

function StepGettingStarted(props: {goals: Goals}) {
  return (
    <>
      <p>
        <i>Let's start with the basics.</i>
      </p>
      <p>
        The outline contains <em>items</em>. You can press <FakeButton icon="new" label="New" /> and{" "}
        <FakeButton icon="newChild" label="New Child" /> on the toolbar to create a some items.
      </p>
      <p>
        <G.EmbeddedGoal id="create-item" goals={props.goals} />
      </p>
      <p>
        Items that have a filled bullet next to them have hidden children. You can expand an item by clicking on
        its bullet.
      </p>
      <p>
        <G.EmbeddedGoal id="expand-item" goals={props.goals} />
      </p>
      <p>
        <i>
          Tip: Most buttons on the toolbar also have keyboard shortcuts. Hover over a button to see its shortcuts.
        </i>
      </p>
    </>
  );
}

function StepReorganizing(props: {goals: Goals}) {
  return (
    <>
      <p>
        <i>
          Curation is the key to a useful library of notes. Delete notes you don't use, and move old notes to where
          they belong.
        </i>
      </p>
      <p>
        To delete an item you no longer care about from the database, use{" "}
        <FakeButton icon="destroy" label="Destroy" />. This deletes the item permanently.
      </p>
      <p>
        <G.EmbeddedGoal id="delete-item" goals={props.goals} />
      </p>
      <p>
        You can also remove an item from its parent <em>without</em> deleting it from the database with{" "}
        <FakeButton icon="remove" label="Remove" />. If the item has any other parents, you can still find it
        there.
      </p>
      <p>
        <G.EmbeddedGoal id="remove-item" goals={props.goals} />
      </p>
      <p>
        You can use <FakeButton icon="up" label="Up" />,
        <FakeButton icon="down" label="Down" />,
        <FakeButton icon="unindent" label="Unindent" /> and <FakeButton icon="indent" label="Indent" /> to
        reorganize items among their neighbours.
      </p>
      <p>
        <G.EmbeddedGoal id="move-item" goals={props.goals} />
      </p>
      <p>
        <i>
          Tip: Don't forget that you can have the same item in multiple places. Sometimes it makes more sense to
          add a parent instead of moving a item.
        </i>
      </p>
    </>
  );
}

function StepFlexibleHierarchy(props: {goals: Goals}) {
  return (
    <>
      <p>
        <i>
          Thinktool lets you have more than one parent for each item. You can find the item under all of its
          parents.
        </i>
      </p>
      <p>
        To add a second parent to an existing item, first click on an item to focus it. Then click{" "}
        <FakeButton icon="insertParent" label="Parent" />, and search for another item that you want to add as a
        parent.
      </p>
      <p>
        <G.EmbeddedGoal id="add-parent" goals={props.goals} />
      </p>
      <p>
        Notice how a little green box showed up above the item? You can click on it to go to the other parent. Just
        use the back button in your browser to go back.
      </p>
      <p>
        <i>Tip: Where you would use a tag in another note-taking app, you can add a parent in Thinktool insead.</i>
      </p>
      <p>
        You can also add an existing item as a sibling of the focused item with{" "}
        <FakeButton icon="insertSibling" label="Sibling" /> or as a child with{" "}
        <FakeButton icon="insertChild" label="Child" />.
      </p>
    </>
  );
}

function StepBidirectionalLinks(props: {goals: Goals}) {
  return (
    <>
      <p>
        <i>Use links to connect concepts that don't fit in a hierarchy.</i>
      </p>
      <p>
        To insert a link, first edit an item by clicking on it. Then press{" "}
        <FakeButton icon="insertLink" label="Link" />, and select the item that you want to link to.
      </p>
      <p>
        <G.EmbeddedGoal id="insert-link" goals={props.goals} />
      </p>
      <p>
        After you've inserted a link, you can expand the link by clicking on it. This shows you the linked item
        directly in the outline.
      </p>
      <p>
        <G.EmbeddedGoal id="expand-link" goals={props.goals} />
      </p>
      <p>
        <i>
          Tip: You can also middle click on a link to jump there. Use the back button in your browser to go back.
        </i>
      </p>
      <p>
        Whenever you insert a link, Thinktool will automatically add a reference in the opposite direction.
        References are shown with a blue dash next to them.
      </p>
    </>
  );
}

function StepStayingFocused(props: {goals: Goals}) {
  return (
    <>
      <p>
        <i>
          Thinktool shows you everything you need right in the outline. But you can still jump to specific items
          when you need to focus on just the thing you're working on.
        </i>
      </p>
      <p>
        To narrow your view, click on an item and then press <FakeButton icon="jump" label="Jump" />. This will
        show you just that item and all its parents, children and references.
      </p>
      <p>
        <p>
          <G.EmbeddedGoal id="jump-item" goals={props.goals} />
        </p>
      </p>
      <p>You can use the back button in your browser to go back.</p>
      <p>
        <i>
          Tip: If you have a mouse with three buttons, you can also just middle click on the bullet next to an item
          to jump there directly.
        </i>
      </p>
      <p>
        If you get lost, you can always go back to the default item with
        <FakeButton icon="home" label="Home" />.
      </p>
      <p>
        <G.EmbeddedGoal id="jump-home" goals={props.goals} />
      </p>
      <p>
        <i>Tip: Try to organize your items so you can find them again from the home view.</i>
      </p>
      <p>
        You can also find a specific item with the <FakeButton icon="find" label="Find" /> button. Just search for
        an item by its content and select it to jump there.
      </p>
      <p>
        <G.EmbeddedGoal id="find-item" goals={props.goals} />
      </p>
    </>
  );
}

function StepHaveFun(props: {send: A.Send}) {
  return (
    <>
      <p>
        <i>That's it! I hope you find Thinktool useful.</i>
      </p>
      <p>
        If you ever want to do the tutorial again, just press the <FakeButton icon="tutorial" label="Tutorial" />{" "}
        button.
      </p>
      <p>
        If you have any questions, feedback or other comments, post them to{" "}
        <ExternalLink send={props.send} href="https://old.reddit.com/r/thinktool/">
          the subreddit
        </ExternalLink>
        , which you can always get to by pressing <FakeButton icon="forum" label="Forum" />.
      </p>
      <p>
        If you prefer, you are also welcome to email me directly at{" "}
        <ExternalLink send={props.send} href="mailto:jonas@thinktool.io">
          jonas@thinktool.io
        </ExternalLink>
        .
      </p>
      <p>
        <i>Thanks for trying out Thinktool!</i>
      </p>
    </>
  );
}
