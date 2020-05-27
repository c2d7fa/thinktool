export type Content = (string | {link: string})[];

export type FullStateResponse = {
  things: {
    name: string;
    content: Content;
    children: {name: string; child: string}[];
  }[];
};

export type ThingData = {content: Content; children: {name: string; child: string}[]};

export type UpdateThings = {
  name: string;
  content: Content;
  children: {name: string; child: string}[];
}[];

export type Changelog = {changes: {date: string; title: string}[]};
