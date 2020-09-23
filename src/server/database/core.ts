import * as pg from "pg";

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
  pool = new pg.Pool({
    host,
    user: username,
    password,
    database: "postgres",
    port,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 10000,
    max: 10,
  });
}

export async function withClient<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  client: pg.PoolClient,
  callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}
