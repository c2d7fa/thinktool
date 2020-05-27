import * as Sqlite from "sqlite";
import {Database as SqliteDriver} from "sqlite3";

import * as Client from "thinktool-client";

export async function initialize(path: string): Promise<Client.Storage.Storage> {
  const db = await Sqlite.open({filename: path, driver: SqliteDriver});

  await db.exec(`CREATE TABLE IF NOT EXISTS properties (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  await db.exec(
    `INSERT OR REPLACE INTO properties (key, value) VALUES ('version', '0'), ('last-opened', DATETIME())`,
  );
  await db.exec(`INSERT OR IGNORE INTO properties (key, value) VALUES ('tutorial-finished', 'false')`);

  async function getFullState(): Promise<Client.Communication.FullStateResponse> {
    return {things: []};
  }

  async function setContent(thing: string, content: Client.Communication.Content): Promise<void> {}

  async function deleteThing(thing: string): Promise<void> {}

  async function updateThings(
    things: {
      name: string;
      content: Client.Communication.Content;
      children: {name: string; child: string}[];
    }[],
  ): Promise<void> {}

  async function getTutorialFinished(): Promise<boolean> {
    return (await db.get(`SELECT value FROM properties WHERE key = 'tutorial-finished'`)).value === "true";
  }

  async function setTutorialFinished(): Promise<void> {
    await db.exec(`UPDATE properties SET value = 'true' WHERE key = 'tutorial-finished'`);
  }

  return {
    getFullState,
    setContent,
    deleteThing,
    updateThings,
    getTutorialFinished,
    setTutorialFinished,
  };
}
