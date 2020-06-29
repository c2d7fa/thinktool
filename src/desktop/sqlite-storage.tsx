import * as Sqlite from "sqlite";
import {Database as SqliteDriver} from "sqlite3";

import * as Client from "thinktool-client";

export async function initialize(path: string): Promise<Client.Storage.Storage> {
  const db = await Sqlite.open({filename: path, driver: SqliteDriver});

  await db.exec(`CREATE TABLE IF NOT EXISTS property (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  await db.exec(
    `INSERT OR REPLACE INTO property (key, value) VALUES ('version', '0'), ('last-opened', DATETIME())`,
  );
  await db.exec(`INSERT OR IGNORE INTO property (key, value) VALUES ('tutorial-finished', 'false')`);

  await db.exec(
    `CREATE TABLE IF NOT EXISTS item (name TEXT PRIMARY KEY, content JSON NOT NULL DEFAULT '[]')`,
  );
  await db.exec(
    `CREATE TABLE IF NOT EXISTS connection (name TEXT PRIMARY KEY, parent TEXT REFERENCES items (name) NOT NULL, child TEXT REFERENCES items (name) NOT NULL, parent_index INTEGER NOT NULL)`,
  );

  // [FIXME] Should also return 'isPage'.
  async function getFullState(): Promise<Client.Communication.FullStateResponse> {
    const result = await db.all(
      `
      SELECT
        name, content,
        (
          SELECT JSON_GROUP_ARRAY(child_connection)
          FROM (
            SELECT JSON_OBJECT('name', connection.name, 'child', child) AS child_connection
            FROM connection
            WHERE parent = item.name
            ORDER BY parent_index
          )
        ) as children
      FROM item
      ORDER BY name ASC
    `,
    );

    const things = result.map((row) => ({
      name: row.name,
      content: JSON.parse(row.content),
      children: JSON.parse(row.children).map((childJson: any) => JSON.parse(childJson)),
    }));

    return {things};
  }

  async function setContent(thing: string, content: Client.Communication.Content): Promise<void> {
    db.run(`UPDATE item SET content = ?2 WHERE name = ?1`, thing, JSON.stringify(content));
  }

  async function deleteThing(thing: string): Promise<void> {
    db.getDatabaseInstance().serialize(async () => {
      await db.run(`DELETE FROM connection WHERE parent = ?1 OR child = ?1`, thing);
      await db.run(`DELETE FROM item WHERE name = ?1`, thing);
    });
  }

  // [FIXME] Should also pass 'isPage'; see server implementation of this
  // function.
  async function updateThings(
    things: {
      name: string;
      content: Client.Communication.Content;
      children: {name: string; child: string}[];
    }[],
  ): Promise<void> {
    db.getDatabaseInstance().serialize(async () => {
      for (const thing of things) {
        await db.run(
          `INSERT OR REPLACE INTO item (name, content) VALUES (?1, ?2)`,
          thing.name,
          JSON.stringify(thing.content),
        );

        // Clear old connections before inserting new connections
        await db.run(`DELETE FROM connection WHERE parent = ?1`, thing.name);

        for (let i = 0; i < thing.children.length; ++i) {
          const {name, child} = thing.children[i];
          await db.run(
            `INSERT INTO connection (name, parent, child, parent_index) VALUES (?1, ?2, ?3, ?4)`,
            name,
            thing.name,
            child,
            i,
          );
        }
      }
    });
  }

  async function getTutorialFinished(): Promise<boolean> {
    return (await db.get(`SELECT value FROM property WHERE key = 'tutorial-finished'`)).value === "true";
  }

  async function setTutorialFinished(): Promise<void> {
    await db.exec(`UPDATE property SET value = 'true' WHERE key = 'tutorial-finished'`);
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
