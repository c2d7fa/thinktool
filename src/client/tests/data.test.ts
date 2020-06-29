/// <reference types="@types/jest" />

import * as D from "../src/data";

describe("Pages", () => {
  describe("The root item in the default state", () => {
    const state = D.empty;

    it("Is not a page", () => {
      expect(D.isPage(state, "0")).toBe(false);
    });

    const state2 = D.togglePage(state, "0");
    test("Becomes a page after toggling page status", () => {
      expect(D.isPage(state2, "0")).toBe(true);
    });

    const state3 = D.togglePage(state2, "0");
    test("Is not a page after toggling page status twice", () => {
      expect(D.isPage(state3, "0")).toBe(false);
    });
  });

  describe("A non-existant item", () => {
    const state = D.empty;

    it("Is not a page", () => {
      expect(D.isPage(state, "fake")).toBe(false);
    });

    const state2 = D.togglePage(state, "fake");
    it("Is still not a page even after toggling it", () => {
      expect(D.isPage(state2, "fake")).toBe(false);
    });
  });
});
