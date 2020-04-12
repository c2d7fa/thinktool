import * as pg from "pg";
import * as bcrypt from "bcrypt";

export type UserId = {name: string};

// We require the consumer of this module to call initialize() before doing
// anything else.
let client: pg.Client = undefined as never;

export async function initialize(
  host: string,
  username: string,
  password: string,
  port: number,
): Promise<void> {
  console.log("Database: Connecting to database at %s:%s as user %s", host, port, username);
  client = new pg.Client({host, user: username, password, database: "postgres", port});
  await client.connect();
}

export interface Users {
  nextId: number;
  users: {[name: string]: {password: string; id: number}};
}

// Check password and return user ID.
export async function userId(name: string, password: string): Promise<UserId | null> {
  const result = await client.query(`SELECT name, password FROM users WHERE name = $1`, [name]);

  if (result.rowCount !== 1) return null;

  if (await bcrypt.compare(password, result.rows[0].password)) {
    return {name: result.rows[0].name};
  } else {
    return null;
  }
}

export async function userName(userId: UserId): Promise<string | null> {
  const result = await client.query(`SELECT name FROM users WHERE name = $1`, [userId.name]);
  if (result.rowCount !== 1) return null;
  return result.rows[0].name;
}

export async function createUser(
  user: string,
  password: string,
): Promise<{type: "success"; userId: UserId} | {type: "error"}> {
  const hashedPassword = await bcrypt.hash(password, 6);

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
  }
}

export async function getFullState(
  userId: UserId,
): Promise<{
  things: {name: string; content: string; children: {name: string; child: string; tag?: string}[]}[];
}> {
  return {things: []};

  // // [TODO] This is absurdly inefficient. It's weirdly difficult to do stuff
  // // like this in MongoDB. Maybe we should just switch to SQL?

  // const documents = await client.db("diaform").collection("things").find({user: userId.name}).toArray();

  // let things: {name: string; content: string; children: {name: string; child: string; tag?: string}[]}[] = [];

  // for (const document of documents) {
  //   let children = [];
  //   for (const connection of document.connections) {
  //     const connectionDocument = await client
  //       .db("diaform")
  //       .collection("connections")
  //       .findOne({user: userId.name, name: connection});
  //     children.push({
  //       name: connection,
  //       child: connectionDocument.child,
  //       tag: connectionDocument.tag ?? undefined,
  //     });
  //   }
  //   things.push({name: document.name, content: document.content ?? "", children});
  // }

  // return {things};
}

export async function thingExists(userId: UserId, thing: string): Promise<boolean> {
  return false;
  // return (await client.db("diaform").collection("things").find({user: userId.name, name: thing}).count()) > 0;
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
  return;
  // // Create/update child connections
  // for (const connection of children) {
  //   await client
  //     .db("diaform")
  //     .collection("connections")
  //     .updateOne(
  //       {user: userId.name, name: connection.name},
  //       {$set: {parent: thing, child: connection.child, tag: connection.tag}},
  //       {upsert: true},
  //     );
  // }

  // // Remove old connections
  // await client
  //   .db("diaform")
  //   .collection("connections")
  //   .deleteMany({user: userId.name, parent: thing, name: {$nin: children.map((c) => c.name)}});

  // // Update the item itself
  // await client
  //   .db("diaform")
  //   .collection("things")
  //   .updateOne(
  //     {user: userId.name, name: thing},
  //     {$set: {content, connections: children.map((ch) => ch.name)}},
  //     {upsert: true},
  //   );
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  // await client.db("diaform").collection("things").deleteOne({user: userId.name, name: thing});
  // await client.db("diaform").collection("connections").deleteMany({user: userId.name, child: thing});
  // await client.db("diaform").collection("connections").deleteMany({user: userId.name, parent: thing});
  // await client
  //   .db("diaform")
  //   .collection("connections")
  //   .updateMany({user: userId.name, tag: thing}, {$unset: {tag: ""}});
}

export async function setContent(userId: UserId, thing: string, content: string): Promise<void> {
  // await client
  //   .db("diaform")
  //   .collection("things")
  //   .updateOne({user: userId.name, name: thing}, {$set: {content}}, {upsert: true});
}

export async function getThingData(
  userId: UserId,
  thing: string,
): Promise<{content: string; children: {name: string; child: string; tag?: string}[]} | null> {
  return null;

  // const document = await client.db("diaform").collection("things").findOne({user: userId.name, name: thing});

  // if (document === null) return null;

  // let children = [];
  // for (const connection of document.connections) {
  //   const connectionDocument = await client
  //     .db("diaform")
  //     .collection("connections")
  //     .findOne({user: userId.name, name: connection});
  //   children.push({
  //     name: connection,
  //     child: connectionDocument.child,
  //     tag: connectionDocument.tag ?? undefined,
  //   });
  // }

  // return {content: document.content ?? "", children};
}

export async function deleteAllUserData(userId: UserId): Promise<void> {
  // await client.db("diaform").collection("users").deleteOne({name: userId.name});
  // await client.db("diaform").collection("things").deleteMany({user: userId.name});
  // await client.db("diaform").collection("connections").deleteMany({user: userId.name});
}
