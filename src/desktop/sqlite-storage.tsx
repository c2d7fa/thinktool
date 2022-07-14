import * as Sqlite from "sqlite";
import {Database as SqliteDriver} from "sqlite3";

import * as Client from "@thinktool/client";

export async function initialize(path: string): Promise<Client.Storage> {
  const db = await Sqlite.open({filename: path, driver: SqliteDriver});

  let version = -1;
  try {
    version = +(await db.get(`SELECT value FROM property WHERE key = 'version'`)).value;
  } catch (e) {
    // [FIXME] This assumption may be wrong!
    console.warn(
      "Got exception: %o. Assuming that this means that file is not initialized, so we'll build it from scratch.",
      e,
    );
  }

  if (version === -1) {
    console.log("Initializing database from scratch to version 1");

    await db.exec(`CREATE TABLE property (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    await db.exec(`INSERT INTO property (key, value) VALUES ('version', '1'), ('tutorial-finished', 'false')`);
    await db.exec(
      `CREATE TABLE item (name TEXT PRIMARY KEY, content JSON NOT NULL DEFAULT '[]', is_page INTEGER NOT NULL DEFAULT 0)`,
    );
    await db.exec(
      `CREATE TABLE connection (name TEXT PRIMARY KEY, parent TEXT REFERENCES items (name) NOT NULL, child TEXT REFERENCES items (name) NOT NULL, parent_index INTEGER NOT NULL)`,
    );
  } else if (version === 0) {
    console.log("Upgrading database from version 0 to version 1");

    db.getDatabaseInstance().serialize(() => {
      const db_ = db.getDatabaseInstance();
      db_.exec(`ALTER TABLE item ADD COLUMN is_page INTEGER NOT NULL DEFAULT 0`);
      db_.exec(`INSERT OR REPLACE INTO property (key, value) VALUES ('version', 1)`);
    });
  } else if (version === 1) {
    console.log("Database is already at latest version 1");
  } else {
    throw `Unsupported database version ${version}!`;
  }

  await db.exec(`INSERT OR REPLACE INTO property (key, value) VALUES ('last-opened', DATETIME())`);

  // [FIXME] Should also return 'isPage'.
  async function getFullState(): Promise<Client.Communication.FullStateResponse> {
    const result = await db.all(
      `
      SELECT
        name, content, is_page,
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
      isPage: row["is_page"] === 1 ? true : undefined,
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

  async function updateThings(
    things: {
      name: string;
      content: Client.Communication.Content;
      children: {name: string; child: string}[];
      isPage: boolean;
    }[],
  ): Promise<void> {
    db.getDatabaseInstance().serialize(async () => {
      for (const thing of things) {
        await db.run(
          `INSERT OR REPLACE INTO item (name, content, is_page) VALUES (?1, ?2, ?3)`,
          thing.name,
          JSON.stringify(thing.content),
          thing.isPage ? 1 : 0,
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
