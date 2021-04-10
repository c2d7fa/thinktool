import * as S from "@thinktool/search";
import * as D from "./data";

export default class Search {
  private search: S.Search;

  constructor(state: D.State) {
    this.search = new S.Search(D.allThings(state).map((thing) => ({thing, content: D.contentText(state, thing)})));
  }

  query(text: string, limit: number): S.Result[] {
    return this.search.query(text, limit);
  }
}
