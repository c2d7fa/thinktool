import * as React from "react";

const ExternalLinkContext = React.createContext<ExternalLinkType>(DefaultExternalLink);

export type ExternalLinkType = (props: {
  href: string;
  children: React.ReactNode;
  [x: string]: any;
}) => JSX.Element;

function DefaultExternalLink(props: {
  href: string;
  children: React.ReactNode;
  [x: string]: any;
}): JSX.Element {
  const attrs = {...props};
  delete attrs.href;
  return (
    <a {...attrs} href={props.href} target="_blank" rel="nofollow">
      {props.children}
    </a>
  );
}

export const ExternalLinkProvider = ExternalLinkContext.Provider;

export function ExternalLink(props: {
  href: string;
  children: React.ReactNode;
  [x: string]: any;
}): JSX.Element {
  return (
    <ExternalLinkContext.Consumer>
      {(ExternalLinkComponent) => <ExternalLinkComponent {...props} />}
    </ExternalLinkContext.Consumer>
  );
}
