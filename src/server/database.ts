import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import {Communication} from "@thinktool/shared";

// We require the consumer of this module to call initialize() before doing
// anything else.

export {UserId, initialize} from "./database/core";
export * as Session from "./database/session";

import {UserId, withClient, withTransaction} from "./database/core";
import {isValid} from "@johv/miscjs/lib/spec";

export interface Users {
  nextId: number;
  users: {[name: string]: {password: string; id: number}};
}

// Check password and return user ID.
export async function userId(name: string, password: string): Promise<UserId | null> {
  return await withClient(async (client) => {
    const result = await client.query(`SELECT name, password FROM users WHERE name = $1`, [name]);

    if (result.rowCount !== 1) return null;

    if (await bcrypt.compare(password, result.rows[0].password)) {
      return {name: result.rows[0].name};
    } else {
      console.log("DB: User '%s' tried to log in with incorrect password.", name);
      return null;
    }
  });
}

export async function userName(userId: UserId): Promise<string | null> {
  return await withClient(async (client) => {
    const result = await client.query(`SELECT name FROM users WHERE name = $1`, [userId.name]);
    if (result.rowCount !== 1) return null;
    return result.rows[0].name;
  });
}

export async function createUser(
  user: string,
  password: string,
  email: string,
): Promise<{type: "success"; userId: UserId} | {type: "error"}> {
  return await withClient(async (client) => {
    const hashedPassword = await bcrypt.hash(password, 6);

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
    }
  });
}

export async function setPassword(user: UserId, password: string): Promise<void> {
  const hashedPassword = await bcrypt.hash(password, 6);
  return await withClient(async (client) => {
    await client.query(`UPDATE users SET password = $2 WHERE name = $1`, [user.name, hashedPassword]);
  });
}

export async function userWithEmail(email: string): Promise<UserId | null> {
  return await withClient(async (client) => {
    const result = await client.query(`SELECT name FROM users WHERE email = $1`, [email]);
    if (result.rowCount === 0) return null;
    else return {name: result.rows[0].name as string};
  });
}

export async function registerResetKey({user, key}: {user: UserId; key: string}): Promise<void> {
  return await withClient(async (client) => {
    await client.query(
      `INSERT INTO reset_keys ("user", key, expire) VALUES ($1, $2, NOW() + INTERVAL '2 hours')`,
      [user.name, key],
    );
  });
}

export async function userForResetKey(key: string): Promise<UserId | null> {
  return await withClient(async (client) => {
    const result = await client.query(`SELECT "user" FROM reset_keys WHERE key = $1 AND expire > NOW()`, [key]);
    return (result.rowCount === 1 && {name: result.rows[0].user as string}) || null;
  });
}

export async function getFullState(userId: UserId): Promise<{
  things: {
    name: string;
    content: Communication.Content;
    children: {name: string; child: string}[];
    isPage?: true;
  }[];
}> {
  return await withClient(async (client) => {
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
    const things = result.rows.map((row) => ({
      name: row.name,
      content: row.content,
      children: row.children,
      isPage: (row["is_page"] ? true : undefined) as true | undefined,
    }));

    return {things};
  });
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
  await withClient(async (client) => {
    return await withTransaction(client, async (client) => {
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
    });
  });
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  await withClient(async (client) => {
    await client.query(`DELETE FROM connections WHERE "user" = $1 AND (parent = $2 OR child = $2)`, [
      userId.name,
      thing,
    ]);
    await client.query(`UPDATE connections SET tag = NULL WHERE "user" = $1 AND tag = $2`, [userId.name, thing]);
    await client.query(`DELETE FROM things WHERE "user" = $1 AND name = $2`, [userId.name, thing]);
  });
}

// IMPORTANT: You must validate the content BEFORE passing it into this
// function! Otherwise, invalid data will be stored in the database!
export async function setContent(userId: UserId, thing: string, content: Communication.Content): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `UPDATE things SET json_content = $3, last_modified = NOW() WHERE "user" = $1 AND name = $2`,
      [userId.name, thing, JSON.stringify(content)],
    );
  });
}

export async function getThingData(
  userId: UserId,
  thing: string,
): Promise<{
  content: Communication.Content;
  children: {name: string; child: string}[];
  isPage: boolean;
} | null> {
  return await withClient(async (client) => {
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
  });
}

export async function deleteAllUserData(userId: UserId): Promise<void> {
  await withClient(async (client) => {
    await withTransaction(client, async (client) => {
      await client.query(`DELETE FROM connections WHERE "user" = $1`, [userId.name]);
      await client.query(`DELETE FROM things WHERE "user" = $1`, [userId.name]);
      await client.query(`DELETE FROM users WHERE name = $1`, [userId.name]);
    });
  });
}

export async function getEmail(userId: UserId): Promise<string | null> {
  return await withClient(async (client) => {
    const result = await client.query(`SELECT email FROM users WHERE name = $1`, [userId.name]);
    return result.rows[0].email;
  });
}

export async function setEmail(userId: UserId, email: string): Promise<void> {
  await withClient(async (client) => {
    await client.query(`UPDATE users SET email = $2 WHERE name = $1`, [userId.name, email]);
  });
}

export const newsletterService = {
  async getKey({email}: {email: string}): Promise<string | null> {
    return await withClient(async (client) => {
      const result = await client.query(
        `SELECT unsubscribe_token FROM newsletter_subscriptions WHERE email = $1 AND unsubscribed IS NULL`,
        [email],
      );
      if (result.rowCount === 0) return null;
      const row = result.rows[0];
      if (!isValid({unsubscribe_token: "string"}, row)) {
        console.error("Unexpected:", row);
        return null;
      }
      return row.unsubscribe_token;
    });
  },

  async getEmail({key}: {key: string}): Promise<string | null> {
    return await withClient(async (client) => {
      const result = await client.query(
        `SELECT email FROM newsletter_subscriptions WHERE unsubscribe_token = $1 AND unsubscribed IS NULL`,
        [key],
      );
      if (result.rowCount === 0) return null;
      const row = result.rows[0];
      if (!isValid({email: "string"}, row)) {
        console.error("Unexpected: %o", row);
        return null;
      }
      return row.email;
    });
  },

  async do(action: {addSubscription?: {email: string; key: string}; removeSubscription?: {key: string}}) {
    if (action.addSubscription) {
      const {email, key} = action.addSubscription;
      await withClient(async (client) => {
        // It would surely be more sensible to add another record instead of
        // updating old records, but our schema doesn't allow that, and I'm too
        // lazy to update it.
        await client.query(
          `UPDATE newsletter_subscriptions SET unsubscribed = NULL, unsubscribe_token = $2 WHERE email = $1`,
          [email, key],
        );
        await client.query(
          `INSERT INTO newsletter_subscriptions (email, registered, unsubscribe_token) VALUES ($1, NOW(), $2) ON CONFLICT (email) DO NOTHING`,
          [email, key],
        );
      });
    }

    if (action.removeSubscription) {
      const {key} = action.removeSubscription;
      await withClient(async (client) => {
        await client.query(
          "UPDATE newsletter_subscriptions SET unsubscribed = NOW() WHERE unsubscribe_token = $1",
          [key],
        );
      });
    }
  },
};

export async function getTutorialFinished(userId: UserId): Promise<boolean> {
  return await withClient(async (client) => {
    const result = await client.query(`SELECT tutorial_finished FROM users WHERE name = $1`, [userId.name]);

    if (result.rowCount !== 1) {
      console.warn("Wrong number of rows: %o", result);
      return false;
    }

    return result.rows[0].tutorial_finished;
  });
}

export async function setTutorialFinished(userId: UserId, finished: boolean): Promise<void> {
  await withClient(async (client) => {
    await client.query(`UPDATE users SET tutorial_finished = $2 WHERE name = $1`, [userId.name, finished]);
  });
}
