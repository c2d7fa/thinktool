import SearchWorker from "./search.worker";

let worker = (null as any) as Worker;

export type Result = {thing: string; content: string};

export class Search {
  private resultsCallbacks: ((results: Result[]) => void)[];

  constructor(data: Result[]) {
    if (worker === null) worker = new SearchWorker();

    this.resultsCallbacks = [];

    worker.postMessage({tag: "initialize", data});
    worker.onmessage = (ev: MessageEvent) => {
      if (ev.data.tag === "results") {
        this.emitResults(ev.data.results);
      }
    };
  }

  reset(data: Result[]) {
    worker.postMessage({tag: "initialize", data});
  }

  query(text: string, limit: number): void {
    worker.postMessage({tag: "query", text, limit});
  }

  on(event: "results", callback: (results: Result[]) => void): void {
    this.resultsCallbacks.push(callback);
  }

  private emitResults(results: Result[]) {
    this.resultsCallbacks.forEach((callback) => callback(results));
  }
}
