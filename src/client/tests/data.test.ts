/// <reference types="@types/jest" />

import {FullStateResponse} from "@thinktool/shared/dist/communication";
import * as D from "../src/data";

describe("links", () => {
  test("an item with no links in its content has no links", () => {
    let data = D.empty;
    data = D.create(data, "nolinks")[0];
    data = D.setContent(data, "nolinks", ["Hello. This item has no links."]);

    expect(D.references(data, "nolinks").length).toBe(0);
  });

  test("an item's links are exactly those in its content", () => {
    let data = D.empty;
    data = D.create(data, "1")[0];
    data = D.create(data, "2")[0];
    data = D.create(data, "links")[0];
    data = D.setContent(data, "links", ["Link to ", {link: "1"}, " and ", {link: "2"}, "."]);

    expect(D.references(data, "links")).toEqual(["1", "2"]);
  });

  test("duplicate links are counted only once", () => {
    let data = D.empty;
    data = D.create(data, "1")[0];
    data = D.create(data, "links")[0];
    data = D.setContent(data, "links", ["Linking ", {link: "1"}, " twice: ", {link: "1"}, "."]);

    expect(D.references(data, "links")).toEqual(["1"]);
  });
});

describe("references", () => {
  test("an item that isn't linked from anywhere has no references", () => {
    let data = D.empty;
    data = D.create(data, "norefs")[0];

    expect(D.backreferences(data, "norefs").length).toBe(0);
  });

  test("an item's references are exactly those that link to it", () => {
    let data = D.empty;
    data = D.create(data, "refs")[0];
    data = D.create(data, "1")[0];
    data = D.create(data, "2")[0];

    data = D.setContent(data, "1", [{link: "refs"}]);
    data = D.setContent(data, "2", [{link: "refs"}]);

    expect(D.backreferences(data, "refs")).toEqual(["1", "2"]);
  });

  test("each reference is counted only once, even if it links multiple times", () => {
    let data = D.empty;

    data = D.create(data, "refs")[0];
    data = D.create(data, "1")[0];

    data = D.setContent(data, "1", [{link: "refs"}, {link: "refs"}]);

    expect(D.backreferences(data, "refs")).toEqual(["1"]);
  });
});

describe("loading from server response", () => {
  test("links references are initialized from content", () => {
    const response: FullStateResponse = {
      things: [
        {name: "0", children: [{name: "0->1", child: "1"}], content: [{link: "1"}]},
        {name: "1", children: [], content: []},
      ],
    };

    const state = D.transformFullStateResponseIntoState(response);

    const links = D.references(state, "0");

    const one = D.children(state, "0")[0];
    const refs = D.backreferences(state, one);

    expect(links).toEqual(["1"]);
    expect(refs).toEqual(["0"]);
  });
});
