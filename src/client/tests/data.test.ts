/// <reference types="@types/jest" />

import {FullStateResponse} from "@thinktool/shared/dist/communication";
import * as D from "../src/data";

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
