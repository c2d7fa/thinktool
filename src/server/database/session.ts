import * as Crypto from "crypto";

import {UserId, connect} from "./core";

// Create a new session for the given user. Whoever calls this is responsible
// for handling authentication; this just creates the session.
export async function create(userId: UserId): Promise<string> {
  const key = await randomBase64({bytes: 24});

  await connect((client) => {
    client.query(`INSERT INTO sessions ("user", key, expire) VALUES ($1, $2, NOW() + INTERVAL '14 days')`, [
      userId.name,
      key,
    ]);
  });

  return key;
}

// Invalidate *ALL* sessions of the given user.
export async function invalidateUser(userId: UserId): Promise<void> {
  await connect((client) => {
    client.query(`DELETE FROM sessions WHERE "user" = $1`, [userId.name]);
  });
}

// Authenticate a user based on the session key. Returns null if the argument is
// not a known session key.
export async function authenticate(sessionKey: string): Promise<UserId | null> {
  const result = await connect((client) => {
    return client.query(`SELECT "user" FROM sessions WHERE key = $1 AND expire > NOW()`, [sessionKey]);
  });

  if (result.rowCount !== 1) return null;

  return {name: result.rows[0].user};
}

//#region Utility functions

async function randomBase64({bytes}: {bytes: number}): Promise<string> {
  return new Promise((resolve, reject) => {
    Crypto.randomBytes(bytes, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer.toString("base64"));
    });
  });
}

//#endregion
