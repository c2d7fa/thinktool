import {Communication} from "@thinktool/shared";

export type ServerError = {error: "disconnected"} | {error: "error"; status: number};

export class ServerApi {
  private clientId: string;
  private apiHost: string;
  private handleError: (error: ServerError) => void;

  async onError(handleError: (error: ServerError) => void) {
    this.handleError = handleError;
  }

  constructor({apiHost}: {apiHost: string}) {
    this.apiHost = apiHost;

    // The server expects us to identify ourselves. This way, the server will not
    // notify us of any changes that we are ourselves responsible for.
    this.clientId = Math.floor(Math.random() * Math.pow(36, 6)).toString(36);

    this.handleError = (error: ServerError) => {};
  }

  private async api(endpoint: string, args?: object) {
    try {
      const response = await fetch(`${this.apiHost}/${endpoint}`, {credentials: "include", ...args});
      if (response.status > 500 || response.status === 400) {
        this.handleError({error: "error", status: response.status});
        return null;
      }
      return response;
    } catch (e) {
      console.warn("Connection error: %o", e);
      this.handleError({error: "disconnected"});
      return null;
    }
  }

  async getFullState(): Promise<Communication.FullStateResponse> {
    const stateResponse = await this.api("state");
    if (stateResponse === null) throw "unable to get response from server"; // [TODO] Return null from here, and handle elsewhere
    return (await stateResponse.json()) as Communication.FullStateResponse;
  }

  async getUsername(): Promise<string | null> {
    const response = await this.api("username");
    if (response === null || response.status === 401) return null;
    return await response.json();
  }

  async setContent(thing: string, content: Communication.Content): Promise<void> {
    await this.api(`api/things/${thing}/content`, {
      method: "put",
      body: JSON.stringify(content),
      headers: {"Content-Type": "application/json", "Thinktool-Client-Id": this.clientId},
    });
  }

  async deleteThing(thing: string): Promise<void> {
    await this.api(`state/things/${thing}`, {method: "delete", headers: {"Thinktool-Client-Id": this.clientId}});
  }

  async updateThings(
    things: {
      name: string;
      content: Communication.Content;
      children: {name: string; child: string}[];
      isPage: boolean;
    }[],
  ): Promise<void> {
    const message: Communication.UpdateThings = things;
    await this.api(`state/things`, {
      method: "post",
      headers: {"Content-Type": "application/json", "Thinktool-Client-Id": this.clientId},
      body: JSON.stringify(message),
    });
  }

  onChanges(callback: (changes: string[]) => void): () => void {
    const apiHostUrl = new URL(this.apiHost);
    const url = `${apiHostUrl.protocol === "https:" ? "wss" : "ws"}://${apiHostUrl.host}/changes`;

    const socket = new WebSocket(url);
    socket.onopen = () => {
      socket.send(this.clientId);
    };
    socket.onmessage = (msg) => {
      const data = msg.data;
      const changes = JSON.parse(data);
      if (!(changes instanceof Array)) throw "bad data from server";
      callback(changes);
    };

    return () => socket.close();
  }

  async getThingData(thing: string): Promise<Communication.ThingData | null> {
    const response = await this.api(`state/things/${thing}`);
    if (response === null || response.status === 404) return null;
    return (await response.json()) as Communication.ThingData;
  }

  async deleteAccount(account: string): Promise<void> {
    // We require the account name here to make it harder to accidentally send a
    // request to delete the user's entire account.
    this.api(`api/account/everything/${account}`, {method: "DELETE"});
  }

  async getEmail(): Promise<string> {
    const response = await this.api(`api/account/email`, {method: "GET"});
    if (response === null) return "";
    return await response.text();
  }

  async setEmail(email: string): Promise<void> {
    await this.api(`api/account/email`, {method: "PUT", body: email});
  }

  async setPassword(password: string): Promise<void> {
    await this.api(`api/account/password`, {method: "PUT", body: password});
  }

  async getTutorialFinished(): Promise<boolean> {
    const response = await this.api(`api/account/tutorial-finished`);
    if (response === null) return false;
    return response.json();
  }

  async setTutorialFinished(): Promise<void> {
    await this.api(`api/account/tutorial-finished`, {method: "PUT", body: "true"});
  }

  async setToolbarState({shown}: {shown: boolean}): Promise<void> {
    await this.api(`api/account/toolbar-shown`, {method: "PUT", body: JSON.stringify(shown)});
  }

  async getToolbarState(): Promise<{shown: boolean}> {
    const response = await this.api(`api/account/toolbar-shown`);
    if (response === null) return {shown: true};
    return {shown: (await response.json()) as boolean};
  }

  get logOutUrl() {
    return `${this.apiHost}/logout`;
  }
}
