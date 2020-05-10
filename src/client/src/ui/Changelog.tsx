import * as React from "react";

import {Communication} from "thinktool-shared";

function grouped(changelog: Communication.Changelog): {[date: string]: string[]} {
  let result: {[date: string]: string[]} = {};
  for (const change of changelog.changes) {
    if (result[change.date] === undefined) result[change.date] = [];
    result[change.date].push(change.title);
  }
  return result;
}

function groupedAndSorted(changelog: Communication.Changelog): {date: string; changes: string[]}[] {
  return Object.keys(grouped(changelog))
    .sort((a, b) => -a.localeCompare(b))
    .map((k) => ({date: k, changes: grouped(changelog)[k]}));
}

export default function Changelog(props: {
  changelog: Communication.Changelog | "loading";
  visible: boolean;
  hide(): void;
}) {
  if (!props.visible) return null;

  if (props.changelog === "loading") {
    return <span>Loading...</span>;
  } else {
    const items = groupedAndSorted(props.changelog);
    return (
      <div className="changelog">
        <button onClick={props.hide}>Close</button>
        <ul className="changelog-entries">
          {items.map((item) => {
            return (
              <li className="changelog-entry">
                <h2>{item.date}</h2>
                <ul>
                  {item.changes.map((change) => {
                    return <li className="changelog-change">{change}</li>;
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}
