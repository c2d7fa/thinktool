/// <reference types="@types/jest" />

import * as PlaceholderItem from "../src/ui/PlaceholderItem";

import * as App from "../src/app";
import * as D from "../src/data";
import * as T from "../src/tree";

describe("a placeholder item", () => {
  it("is shown when the selected item has no children", () => {
    let data = D.empty;
    let tree = T.fromRoot(data, "0");

    let app = App.from(data, tree);

    expect(PlaceholderItem.isVisible(app)).toBe(true);
  });

  it("isn't shown when the selected item has children", () => {
    let data = D.empty;
    data = D.create(data, "1")[0];
    data = D.setContent(data, "1", ["Child"]);
    data = D.addChild(data, "0", "1")[0];

    let tree = T.fromRoot(data, "0");

    let app = App.from(data, tree);

    expect(PlaceholderItem.isVisible(app)).toBe(false);
  });

  it("will create a new child of the currently selected item when activated", () => {
    let data = D.empty;
    let tree = T.fromRoot(data, "0");

    let app = App.from(data, tree);
    expect(D.children(app.state, "0").length).toBe(0);

    app = PlaceholderItem.create(app);
    expect(D.children(app.state, "0").length).toBe(1);
  });

  it("will focus the create item immediately", () => {
    let data = D.empty;
    let tree = T.fromRoot(data, "0");

    let app = App.from(data, tree);
    expect(T.focused(app.tree)).toBeNull();

    app = PlaceholderItem.create(app);
    expect(T.focused(app.tree)).not.toBeNull(); // Lazy test. We should test that it's the new child that has focus.
  });
});
