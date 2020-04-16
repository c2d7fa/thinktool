import * as pg from "pg";
import * as bcrypt from "bcrypt";

export type UserId = {name: string};

// We require the consumer of this module to call initialize() before doing
// anything else.
let pool: pg.Pool = undefined as never;

export async function initialize(
  host: string,
  username: string,
  password: string,
  port: number,
): Promise<void> {
  console.log("Database: Connecting to database at %s:%s as user %s", host, port, username);
  pool = new pg.Pool({host, user: username, password, database: "postgres", port});
}

export interface Users {
  nextId: number;
  users: {[name: string]: {password: string; id: number}};
}

// Check password and return user ID.
export async function userId(name: string, password: string): Promise<UserId | null> {
  const client = await pool.connect();
  const result = await client.query(`SELECT name, password FROM users WHERE name = $1`, [name]);
  client.release();

  if (result.rowCount !== 1) return null;

  if (await bcrypt.compare(password, result.rows[0].password)) {
    return {name: result.rows[0].name};
  } else {
    return null;
  }
}

export async function userName(userId: UserId): Promise<string | null> {
  const client = await pool.connect();
  const result = await client.query(`SELECT name FROM users WHERE name = $1`, [userId.name]);
  client.release();
  if (result.rowCount !== 1) return null;
  return result.rows[0].name;
}

export async function createUser(
  user: string,
  password: string,
): Promise<{type: "success"; userId: UserId} | {type: "error"}> {
  const hashedPassword = await bcrypt.hash(password, 6);

  const client = await pool.connect();

  try {
    const row = (
      await client.query(`INSERT INTO users (name, password) VALUES ($1, $2) RETURNING name`, [
        user,
        hashedPassword,
      ])
    ).rows[0];
    return row.name;
  } catch (e) {
    return {type: "error"};
  } finally {
    client.release();
  }
}

export async function getFullState(
  userId: UserId,
): Promise<{
  things: {name: string; content: string; children: {name: string; child: string; tag?: string}[]}[];
}> {
  const client = await pool.connect();
  const result = await client.query(
    `
    SELECT things.name, things.content, connections.name as connection_name, connections.child, connections.tag, connections.parent_index
    FROM things
    LEFT JOIN connections ON connections.parent = things.name AND connections.user = things.user
    WHERE things.user = $1
    ORDER BY things.name ASC, parent_index ASC
  `,
    [userId.name],
  );
  client.release();

  let thingsObject: {
    [name: string]: {content: string; children: {name: string; child: string; tag?: string}[]};
  } = {};

  for (const row of result.rows) {
    if (!(row.name in thingsObject)) {
      thingsObject[row.name] = {content: row.content, children: []};
    }

    if (row.connection_name !== null) {
      thingsObject[row.name].children.push({
        name: row.connection_name,
        child: row.child,
        tag: row.tag ?? undefined,
      });
    }
  }

  // [TODO] We should just change the signature, so we can return the dictionary
  // we've already made.
  let things: {name: string; content: string; children: {name: string; child: string; tag?: string}[]}[] = [];
  for (const thing in thingsObject) {
    things.push({name: thing, ...thingsObject[thing]});
  }

  return {things};
}

export async function updateThing({
  userId,
  thing,
  content,
  children,
}: {
  userId: UserId;
  thing: string;
  content: string;
  children: {name: string; child: string; tag?: string}[];
}): Promise<void> {
  const client = await pool.connect();
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO things ("user", name, content) VALUES ($1, $2, $3) ON CONFLICT ("user", name) DO UPDATE SET content = EXCLUDED.content`,
    [userId.name, thing, content],
  );

  // Delete old connections
  await client.query(`DELETE FROM connections WHERE "user" = $1 AND parent = $2`, [userId.name, thing]);

  // Store new connections
  for (let i = 0; i < children.length; ++i) {
    const connection = children[i];
    await client.query(
      `INSERT INTO connections ("user", name, parent, child, tag, parent_index) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId.name, connection.name, thing, connection.child, connection.tag, i],
    );
  }

  await client.query("COMMIT");

  client.release();
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  const client = await pool.connect();

  await client.query(`DELETE FROM connections WHERE "user" = $1 AND (parent = $2 OR child = $2)`, [
    userId.name,
    thing,
  ]);
  await client.query(`UPDATE connections SET tag = NULL WHERE "user" = $1 AND tag = $2`, [
    userId.name,
    thing,
  ]);
  await client.query(`DELETE FROM things WHERE "user" = $1 AND name = $2`, [userId.name, thing]);

  client.release();
}

export async function setContent(userId: UserId, thing: string, content: string): Promise<void> {
  const client = await pool.connect();
  await client.query(`UPDATE things SET content = $3 WHERE "user" = $1 AND name = $2`, [
    userId.name,
    thing,
    content,
  ]);
  client.release();
}

export async function getThingData(
  userId: UserId,
  thing: string,
): Promise<{content: string; children: {name: string; child: string; tag?: string}[]} | null> {
  const client = await pool.connect();
  const thingResult = await client.query(`SELECT content FROM things WHERE "user" = $1 AND name = $2`, [
    userId.name,
    thing,
  ]);
  client.release();

  if (thingResult.rowCount !== 1) return null;
  const row = thingResult.rows[0];

  // [TODO] Get children

  return {content: row.content ?? "", children: []};
}

export async function deleteAllUserData(userId: UserId): Promise<void> {
  const client = await pool.connect();

  await client.query("BEGIN");

  await client.query(`DELETE FROM connections WHERE "user" = $1`, [userId.name]);
  await client.query(`DELETE FROM things WHERE "user" = $1`, [userId.name]);
  await client.query(`DELETE FROM users WHERE name = $1`, [userId.name]);

  await client.query("COMMIT");

  client.release();
}
