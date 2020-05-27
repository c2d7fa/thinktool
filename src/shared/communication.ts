export type FullStateResponse = {
  things: {
    name: string;
    content: string;
    children: {name: string; child: string}[];
  }[];
};

export type ThingData = {content: string; children: {name: string; child: string}[]};

export type UpdateThings = {
  name: string;
  content: string;
  children: {name: string; child: string}[];
}[];

export type Changelog = {changes: {date: string; title: string}[]};
