import {Communication} from "@thinktool/shared";
import {Server, ServerError} from "@thinktool/client";

export class ApiHostServer implements Server {
  private clientId: string;
  private apiHost: string;

  constructor({apiHost}: {apiHost: string}) {
    this.apiHost = apiHost;

    // The server expects us to identify ourselves. This way, the server will not
    // notify us of any changes that we are ourselves responsible for.
    this.clientId = Math.floor(Math.random() * Math.pow(36, 6)).toString(36);
  }

  private async withApi<T>(
    endpoint: string,
    args: object,
    f: (response: Response) => T,
  ): Promise<T | ServerError> {
    try {
      const response = await fetch(`${this.apiHost}/${endpoint}`, {credentials: "include", ...args});
      if (response.status !== 200 && response.status !== 404) return {error: "error", status: response.status};
      return f(response);
    } catch (e) {
      return {error: "disconnected"};
    }
  }

  async getFullState() {
    return await this.withApi("state", {}, async (response) => {
      return (await response.json()) as Communication.FullStateResponse;
    });
  }

  async getUsername() {
    return await this.withApi("username", {}, async (response) => {
      return await response.json();
    });
  }

  async setContent(thing: string, content: Communication.Content) {
    return await this.withApi(
      `api/things/${thing}/content`,
      {
        method: "put",
        body: JSON.stringify(content),
        headers: {"Content-Type": "application/json", "Thinktool-Client-Id": this.clientId},
      },
      () => "ok" as const,
    );
  }

  async deleteThing(thing: string) {
    return await this.withApi(
      `state/things/${thing}`,
      {method: "delete", headers: {"Thinktool-Client-Id": this.clientId}},
      () => "ok" as const,
    );
  }

  async updateThings(
    things: {
      name: string;
      content: Communication.Content;
      children: {name: string; child: string}[];
      isPage: boolean;
    }[],
  ) {
    return await this.withApi(
      `state/things`,
      {
        method: "post",
        headers: {"Content-Type": "application/json", "Thinktool-Client-Id": this.clientId},
        body: JSON.stringify(things),
      },
      () => "ok" as const,
    );
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
      if (!(changes instanceof Array)) {
        console.warn("bad data from server");
      } else {
        callback(changes);
      }
    };

    return () => socket.close();
  }

  async getThingData(thing: string) {
    return await this.withApi(`state/things/${thing}`, {}, async (response) => {
      if (response.status === 404) return null;
      return (await response.json()) as Communication.ThingData;
    });
  }

  async deleteAccount(account: string) {
    return await this.withApi(`api/account/everything/${account}`, {method: "DELETE"}, () => "ok" as const);
  }

  async getEmail() {
    return await this.withApi(`api/account/email`, {method: "GET"}, async (response) => {
      return await response.text();
    });
  }

  async setEmail(email: string) {
    return await this.withApi(`api/account/email`, {method: "PUT", body: email}, () => "ok" as const);
  }

  async setPassword(password: string) {
    return await this.withApi(`api/account/password`, {method: "PUT", body: password}, () => "ok" as const);
  }

  async getTutorialFinished() {
    return await this.withApi(`api/account/tutorial-finished`, {}, async (response) => {
      return (await response.json()) as boolean;
    });
  }

  async setTutorialFinished() {
    return await this.withApi(`api/account/tutorial-finished`, {method: "PUT", body: "true"}, () => "ok" as const);
  }

  async setToolbarState({shown}: {shown: boolean}) {
    return await this.withApi(
      `api/account/toolbar-shown`,
      {method: "PUT", body: JSON.stringify(shown)},
      () => "ok" as const,
    );
  }

  async getToolbarState() {
    return await this.withApi(`api/account/toolbar-shown`, {}, async (response) => {
      return {shown: (await response.json()) as boolean};
    });
  }

  get logOutUrl() {
    return `${this.apiHost}/logout`;
  }
}
