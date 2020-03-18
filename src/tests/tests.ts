import * as T from "../client/tree";
import * as D from "../client/data";

test("Creating a thing with a custom ID returns that ID.", () => {
  expect(D.create(D.empty, "custom-id")[1]).toBe("custom-id");
});
