import * as pg from "pg";

export type UserId = {name: string};

// We require the consumer of this module to call initialize() before doing
// anything else.
export let pool: pg.Pool = undefined as never;

export async function initialize(
  host: string,
  username: string,
  password: string,
  port: number,
): Promise<void> {
  console.log("Database: Connecting to database at %s:%s as user %s", host, port, username);
  pool = new pg.Pool({host, user: username, password, database: "postgres", port});
}

export async function connect<T>(callback: (client: pg.PoolClient) => T): Promise<T> {
  const client = await pool.connect();
  try {
    return callback(client);
  } finally {
    client.release();
  }
}
