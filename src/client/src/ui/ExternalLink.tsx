import * as React from "react";
import {Send} from "../app";

export function ExternalLink(props: {
  send: Send;
  href: string;
  children: React.ReactNode;
  [prop: string]: any;
}): JSX.Element {
  const attrs: any = {...props};
  delete attrs.href;
  delete attrs.send;
  return (
    <a
      {...attrs}
      href="#"
      onClick={() => {
        props.send({type: "followExternalLink", href: props.href});
      }}
    >
      {props.children}
    </a>
  );
}
