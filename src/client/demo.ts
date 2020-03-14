import * as D from "./data";

export const initialState: D.Things = (() => {
  let result = D.empty;

  function add(parent: string, child: string, text: string) {
    result = D.create(result, child)[0];
    result = D.setContent(result, child, text);
    result = D.addChild(result, parent, child);
  }

  function child(parent: string, child: string) {
    result = D.addChild(result, parent, child);
  }

  result = D.setContent(result, "0", "Thinktool Demo");

  add("0", "1", "Welcome to the Thinktool demo!");
  add("1", "2", "If you like this demo, you can sign up for an account here: https://thinktool.io/login.html");

  add("0", "3", "Please note that any changes you make here will be discarded when you reload the page.");

  // How to Use

  add("0", "4", "How to Use — (Press the bullet point next to this item to show it!)");

  add("4", "5", "Create a new item by placing the cursor at the end of an existing item and pressing enter.");
  add("5", "6", "(You can also use Ctrl+Enter anywhere to create a new item. If you want to insert a newline, use Shift+Enter.)");

  add("4", "7", "Drag the bullet point to reorder items");
  child("7", "9");

  add("4", "8", "One of the unique features of Thinktool is the ability to have the same item in multiple places:");
  add("8", "9", "To copy an item to a different location, move an item, but hold down Ctrl while dropping it. This will create a copy of the same item.");
  add("9", "10", "For example, here are two copies of the same item:");
  add("10", "11", "Woah, I'm seeing double!");
  child("10", "11");
  add("10", "12", "Try editing one of them to see that it's really the same item.");
  add("8", "13", "You can also press Alt+C while having an item to selected to insert an existing item as a child of the selected item. Enter some text to search for an item.");
  add("8", "14", "When an item has multiple parents, its other parents are automatically shown when you unfold it.");

  add("4", "15", "You can also reference an item in-line:");
  add("15", "16", "To insert a reference to an item, press Alt+L.");
  add("15", "17", "For example, here is a reference to an item: #18. Click on the link to open the item.");
  add("15", "18", "Note that you can see where the item is referenced when it's unfolded.");

  add("4", "19", "To \"zoom in\" on an item, middle click its bullet point.");
  add("19", "20", "This will show the item in full screen, and you can easily navigate to all of its parents, children and references.");

  // Example

  add("0", "21", "Example: Programming Languages");

  add("21", "22", "Statically typed languages");
  add("22", "24", "TypeScript");
  add("22", "23", "Rust");
  add("22", "25", "Haskell");
  add("22", "26", "Scala");

  add("21", "27", "Languages used in web development");
  add("27", "28", "JavaScript");
  child("27", "24");
  add("27", "29", "#26, using #33");

  add("21", "30", "Functional programming languages");
  child("30", "25");
  child("30", "26");
  add("30", "31", "#23 borrows some concepts from functional programming languages");
  add("31", "32", "For example, both Rust and #23 support #38");

  add("26", "33", "Scala.js");
  add("33", "34", "https://www.scala-js.org/");
  add("33", "35", "Scala.js is a compiler from Scala to #28");

  add("24", "36", "TypeScript compiles to #28, but support static typing using a gradual type system");

  add("25", "37", "Features");
  add("37", "38", "Pattern matching");
  add("37", "39", "Monads");
  add("37", "40", "Laziness");

  return result;
})();
