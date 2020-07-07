import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import {Communication} from "thinktool-shared";

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
  const client = await pool.connect();
  const result = await client.query(`SELECT name, password FROM users WHERE name = $1`, [name]);
  client.release();

  if (result.rowCount !== 1) return null;

  if (await bcrypt.compare(password, result.rows[0].password)) {
    return {name: result.rows[0].name};
  } else {
    console.log("DB: User '%s' tried to log in with incorrect password.", name);
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
  things: {
    name: string;
    content: Communication.Content;
    children: {name: string; child: string}[];
    isPage?: true;
  }[];
}> {
  const client = await pool.connect();
  const result = await client.query(
    `
    SELECT
      things.name,
      things.json_content AS content,
      things.is_page,
      (
        SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('name', name, 'child', child)), '[]') AS children
        FROM (
          SELECT connections.name as name, connections.child as child
          FROM connections
          WHERE things.user = connections.user and connections.parent = things.name
          ORDER BY connections.parent_index
        ) AS thing_connections
      )
    FROM things
    WHERE things.user = $1
    ORDER BY things.name asc
    `,
    [userId.name],
  );
  client.release();
  const things = result.rows.map((row) => ({
    name: row.name,
    content: row.content,
    children: row.children,
    isPage: (row["is_page"] ? true : undefined) as true | undefined,
  }));

  return {things};
}

// IMPORTANT: You must validate the the Content is actually valid content.
// Otherwise, invalid data will be stored in the database!
export async function updateThing({
  userId,
  thing,
  content,
  children,
  isPage,
}: {
  userId: UserId;
  thing: string;
  content: Communication.Content;
  children: {name: string; child: string}[];
  isPage: boolean;
}): Promise<void> {
  const client = await pool.connect();
  await client.query("BEGIN");

  await client.query(
    `
    INSERT INTO things ("user", name, json_content, last_modified, is_page)
    VALUES ($1, $2, $3, NOW(), $4)
    ON CONFLICT ("user", name) DO UPDATE SET
      json_content = EXCLUDED.json_content,
      last_modified = EXCLUDED.last_modified,
      is_page = EXCLUDED.is_page
    `,
    [userId.name, thing, JSON.stringify(content), isPage],
  );

  // Delete old connections
  await client.query(`DELETE FROM connections WHERE "user" = $1 AND parent = $2`, [userId.name, thing]);

  // Store new connections
  for (let i = 0; i < children.length; ++i) {
    const connection = children[i];
    await client.query(
      `INSERT INTO connections ("user", name, parent, child, parent_index) VALUES ($1, $2, $3, $4, $5)`,
      [userId.name, connection.name, thing, connection.child, i],
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

// IMPORTANT: You must validate the content BEFORE passing it into this
// function! Otherwise, invalid data will be stored in the database!
export async function setContent(
  userId: UserId,
  thing: string,
  content: Communication.Content,
): Promise<void> {
  const client = await pool.connect();
  await client.query(
    `UPDATE things SET json_content = $3, last_modified = NOW() WHERE "user" = $1 AND name = $2`,
    [userId.name, thing, JSON.stringify(content)],
  );
  client.release();
}

export async function getThingData(
  userId: UserId,
  thing: string,
): Promise<{
  content: Communication.Content;
  children: {name: string; child: string}[];
  isPage: boolean;
} | null> {
  const client = await pool.connect();

  const result = await client.query(
    `
    SELECT things.name, things.json_content, things.is_page, connections.name as connection_name, connections.child
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
      children.push({name: row.connection_name, child: row.child});
    }
  }

  return {
    content: result.rows[0]["json_content"],
    isPage: result.rows[0]["is_page"],
    children,
  };
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
  const unsubscribeToken = await new Promise<string>((resolve, reject) => {
    crypto.randomBytes(12, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer.toString("base64"));
    });
  });
  await client.query(
    `INSERT INTO newsletter_subscriptions (email, registered, unsubscribe_token) VALUES ($1, NOW(), $2) ON CONFLICT (email) DO NOTHING`,
    [email, unsubscribeToken],
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

export async function unsubscribe(key: string): Promise<["ok", string] | "invalid-key"> {
  const client = await pool.connect();
  const result = await client.query(
    "UPDATE newsletter_subscriptions SET unsubscribed = NOW() WHERE unsubscribe_token = $1 RETURNING email",
    [key],
  );
  client.release();

  if (result.rowCount !== 1) {
    return "invalid-key";
  }

  return ["ok", result.rows[0].email];
}
