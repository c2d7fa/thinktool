import * as React from "react";

import * as D from "../data";
import * as T from "../tree";

import * as Main from "../main"; // [TODO] Remove cyclic dependency

export default function TableView(props: {context: Main.Context}) {
  const rows = T.children(props.context.tree, T.root(props.context.tree)).map((childNode) => {
    return (
      <tr key={JSON.stringify(childNode)}>
        <td>
          <ul>
            <Main.ExpandableItem context={props.context} node={childNode} />
          </ul>
        </td>
        <td>Column 2</td>
        <td>Column 3</td>
      </tr>
    );
  });

  return (
    <div className="children-table">
      <table>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
