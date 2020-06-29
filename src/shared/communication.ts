export type Content = (string | {link: string})[];

export type FullStateResponse = {
  things: {
    name: string;
    content: Content;
    children: {name: string; child: string}[];
    isPage?: boolean;
  }[];
};

export type ThingData = {content: Content; children: {name: string; child: string}[]; isPage: boolean};

export type UpdateThings = {
  name: string;
  content: Content;
  children: {name: string; child: string}[];
  isPage: boolean;
}[];

export type Changelog = {changes: {date: string; title: string}[]};
