import * as React from "react";

import * as D from "../data";
import * as T from "../tree";
import * as Tb from "../table";

import * as Main from "../main"; // [TODO] Remove cyclic dependency

export default function TableView(props: {context: Main.Context}) {
  const rows = T.children(props.context.tree, T.root(props.context.tree)).map((childNode) => {
    const cell = Tb.cell(props.context.state, props.context.tree, childNode, "Assigned");

    const cells = Tb.columns(props.context.state, props.context.tree, T.root(props.context.tree)).map(
      (column) => {
        const cellNodes = Tb.cell(props.context.state, props.context.tree, childNode, column);
        return (
          <td key={column}>
            <ul>
              {cellNodes.map((node) => (
                <Main.ExpandableItem
                  key={JSON.stringify(node)}
                  context={props.context}
                  node={node}
                  parent={childNode}
                />
              ))}
            </ul>
          </td>
        );
      },
    );

    return (
      <tr key={JSON.stringify(childNode)}>
        <td>
          <ul>
            <Main.ExpandableItem
              hideTagged={true}
              context={props.context}
              node={childNode}
              parent={T.root(props.context.tree)}
            />
          </ul>
        </td>
        {cells}
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
