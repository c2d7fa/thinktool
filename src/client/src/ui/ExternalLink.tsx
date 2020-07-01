import * as React from "react";

export default function ExternalLink(props: {href: string; children: React.ReactNode; [x: string]: any}) {
  const attrs = {...props};
  delete attrs.href;
  return (
    <a {...attrs} href={props.href} target="_blank" rel="nofollow">
      {props.children}
    </a>
  );
}
