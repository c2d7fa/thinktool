import * as React from "react";

import * as D from "../data";
import * as T from "../tree";
import * as Tb from "../table";

import * as Main from "../main"; // [TODO] Remove cyclic dependency
import {Context} from "../context";

export default function TableView(props: {context: Context}) {
  const columns = Tb.columns(props.context.state, props.context.tree, T.root(props.context.tree));

  const rows = T.children(props.context.tree, T.root(props.context.tree)).map((childNode) => {
    const cells = columns.map((column) => {
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
                hideTag={true}
              />
            ))}
          </ul>
        </td>
      );
    });

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
        <thead>
          <tr>
            <td className="item-column-header"></td>
            {columns.map((column) => (
              <td key={column}>
                <span>{D.contentText(props.context.state, column)}</span>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
