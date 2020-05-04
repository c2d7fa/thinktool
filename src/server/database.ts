import * as bcrypt from "bcrypt";

// We require the consumer of this module to call initialize() before doing
// anything else.

export {UserId, initialize} from "./database/core";
export * as Session from "./database/session";

import {UserId, pool, connect} from "./database/core";

export interface Users {
  nextId: number;
  users: {[name: string]: {password: string; id: number}};
}

// Check password and return user ID.
export async function userId(name: string, password: string): Promise<UserId | null> {
  console.log("[DB] Retrieving user ID for %o, %o", name, password);
  console.log("[DB] Connecting to DB");
  const client = await pool.connect();
  console.log("[DB] Running query");
  const result = await client.query(`SELECT name, password FROM users WHERE name = $1`, [name]);
  console.log("[DB] Query result: %s", JSON.stringify(result));
  console.log("[DB] Releasing client");
  client.release();

  console.log("[DB] Considering early exit");
  if (result.rowCount !== 1) return null;

  console.log("[DB] Verifying password");
  if (await bcrypt.compare(password, result.rows[0].password)) {
    console.log("[DB] Success! Returning");
    return {name: result.rows[0].name};
  } else {
    console.log("[DB] Failure! Returning");
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
  email: string,
): Promise<{type: "success"; userId: UserId} | {type: "error"}> {
  const hashedPassword = await bcrypt.hash(password, 6);

  const client = await pool.connect();

  try {
    const row = (
      await client.query(
        `INSERT INTO users (name, password, email, registered) VALUES ($1, $2, $3, NOW()) RETURNING name`,
        [user, hashedPassword, email],
      )
    ).rows[0];
    return {type: "success", userId: {name: row.name}};
  } catch (e) {
    return {type: "error"};
  } finally {
    client.release();
  }
}

export async function setPassword(user: string, password: string): Promise<void> {
  const hashedPassword = await bcrypt.hash(password, 6);
  const client = await pool.connect();
  await client.query(`UPDATE users SET password = $2 WHERE name = $1`, [user, hashedPassword]);
  client.release();
}

export async function knownUserEmailPair({user, email}: {user: string; email: string}): Promise<boolean> {
  const client = await pool.connect();
  const result = await client.query(`SELECT name, email FROM users WHERE name = $1 AND email = $2`, [
    user,
    email,
  ]);
  client.release();
  if (result.rowCount === 1) {
    // Should always be true, but just to be safe...
    return result.rows[0].name === user && result.rows[0].email === email;
  } else {
    return false;
  }
}

export async function registerResetKey({user, key}: {user: string; key: string}): Promise<void> {
  const client = await pool.connect();
  await client.query(
    `INSERT INTO reset_keys ("user", key, expire) VALUES ($1, $2, NOW() + INTERVAL '2 hours')`,
    [user, key],
  );
  client.release();
}

export async function isValidResetKey(user: string, key: string): Promise<boolean> {
  const client = await pool.connect();
  const result = await client.query(
    `SELECT "user", key FROM reset_keys WHERE "user" = $1 AND key = $2 AND expire > NOW()`,
    [user, key],
  );
  client.release();
  return result.rowCount === 1;
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

  const result = await client.query(
    `
    SELECT things.name, things.content, connections.name as connection_name, connections.child, connections.tag
    FROM things
    LEFT JOIN connections ON connections.user = things.user AND connections.parent = things.name
    WHERE things.user = $1 AND things.name = $2
    ORDER BY parent_index ASC
    `,
    [userId.name, thing],
  );

  client.release();

  if (result.rowCount === 0) return null;

  let children = [];
  for (const row of result.rows) {
    if (row.connection_name !== null) {
      children.push({name: row.connection_name, child: row.child, tag: row.tag ?? undefined});
    }
  }

  return {content: result.rows[0].content ?? "", children};
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

export async function getEmail(userId: UserId): Promise<string | null> {
  const client = await pool.connect();
  const result = await client.query(`SELECT email FROM users WHERE name = $1`, [userId.name]);
  client.release();
  return result.rows[0].email;
}

export async function setEmail(userId: UserId, email: string): Promise<void> {
  const client = await pool.connect();
  await client.query(`UPDATE users SET email = $2 WHERE name = $1`, [userId.name, email]);
  return client.release();
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  const client = await pool.connect();
  await client.query(
    `INSERT INTO newsletter_subscriptions (email, registered) VALUES ($1, NOW()) ON CONFLICT (email) DO NOTHING`,
    [email],
  );
  client.release();
}

export async function getTutorialFinished(userId: UserId): Promise<boolean> {
  const client = await pool.connect();
  const result = await client.query(`SELECT tutorial_finished FROM users WHERE name = $1`, [userId.name]);
  client.release();

  if (result.rowCount !== 1) {
    console.warn("Wrong number of rows: %o", result);
    return false;
  }

  return result.rows[0].tutorial_finished;
}

export async function setTutorialFinished(userId: UserId, finished: boolean): Promise<void> {
  const client = await pool.connect();
  await client.query(`UPDATE users SET tutorial_finished = $2 WHERE name = $1`, [userId.name, finished]);
  client.release();
}
