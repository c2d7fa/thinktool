import * as React from "react";
import * as Misc from "@johv/miscjs";
import Bullet from "./Bullet";

import * as A from "../app";
import * as T from "../tree";
import * as D from "../data";

const OtherParentBullet = React.memo(
  function OtherParentBullet() {
    return <Bullet specialType="parent" beginDrag={() => {}} status="collapsed" toggle={() => {}} />;
  },
  (prev, next) => true, // Never needs update
);

export function useOtherParents({
  app,
  updateApp,
  node,
  parent,
}: {
  app: A.App;
  updateApp(f: (app: A.App) => A.App): void;
  node: T.NodeRef;
  parent?: T.NodeRef;
}): {otherParents: {id: string; text: string}[]; click(id: string): void; altClick(id: string): void} {
  const click = React.useMemo(() => (id: string) => updateApp((app) => A.jump(app, id)), [updateApp]);
  const altClick = React.useMemo(() => (id: string) => updateApp((app) => A.jump(app, id)), [updateApp]);
  const ids = D.otherParents(app.state, T.thing(app.tree, node), parent && T.thing(app.tree, parent));
  return {
    otherParents: ids.map((id) => ({id, text: D.contentText(app.state, id)})),
    click,
    altClick,
  };
}

export const OtherParents = React.memo(
  function OtherParents(props: {
    otherParents: {id: string; text: string}[];
    click(id: string): void;
    altClick(id: string): void;
  }) {
    const listItems = props.otherParents.map(({id, text}, index) => {
      return (
        <li key={index}>
          <span className="other-parent-small" onClick={() => props.click(id)} title={text}>
            <OtherParentBullet />
            &nbsp;
            {Misc.truncateEllipsis(text, 30)}
          </span>
        </li>
      );
    });

    return <ul className="other-parents-small">{listItems}</ul>;
  },
  (prev, next) => {
    return (
      Misc.arrayEq(
        prev.otherParents.map((p) => p.text),
        next.otherParents.map((p) => p.text),
      ) &&
      prev.click === next.click &&
      prev.altClick === next.altClick
    );
  },
);
