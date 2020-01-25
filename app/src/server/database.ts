import * as mongo from "mongodb";

import * as D from "../data";

export type UserId = {name: string};

// This is a hack. We require the consumer of this module to call initialize()
// before doing anything else.
let client: mongo.MongoClient = undefined as never;

export async function initialize(uri: string): Promise<void> {
  client = await (await new mongo.MongoClient(uri, {useUnifiedTopology: true}).connect());
}

export interface Users {
  nextId: number;
  users: {[name: string]: {password: string; id: number}};
}

// Check password and return user ID.
export async function userId(name: string, password: string): Promise<UserId | null> {
  const user = await client.db("diaform").collection("users").findOne({_id: name});

  if (user === null) {
    console.log("found no such user: %o", name);
    return null;
  } else {
    if (user.password as string === password) {
      return {name: user._id as string};
    } else {
      return null;
    }
  }
}

export async function userName(userId: UserId): Promise<string | null> {
  if (await client.db("diaform").collection("users").find({_id: userId.name}).count() > 0) {
    return userId.name;
  } else {
    return null;
  }
}

export async function createUser(user: string, password: string): Promise<{type: "success"; userId: UserId} | {type: "error"; error?: "user-exists"}> {
  if (await client.db("diaform").collection("users").find({_id: user}).count() > 0) {
    return {type: "error", error: "user-exists"};
  }

  const result = await client.db("diaform").collection("users").insertOne({_id: user, name: user, password});
  if (result.result.ok) {
    return {type: "success", userId: {name: user}};
  } else {
    return {type: "error"};
  }
}

// We want to be able to know when a user's data was last updated. This is used
// to figure out if we need to send an update to a client or not; we send
// updates when the last update was later than the last read from the client.

const lastUpdates: {[userName: string]: Date | undefined} = {};

export async function getThings(userId: UserId): Promise<D.Things> {
  return await updateThings(userId, x => x);
}

export async function putThings(userId: UserId, things: D.Things): Promise<void> {
  await updateThings(userId, _ => things);
}

export async function updateThings(userId: UserId, f: (data: D.Things) => D.Things): Promise<D.Things> {
  // We want to do updates atomically. The best way I can think of doing this is
  // to acquire a lock, read the contents, apply the update, and then release
  // the lock. This does not seem to be a very good solution, but I can't think
  // of any better ones.

  // The lock is stored in the database. We try to set it, and if it is not
  // already locked by someone else, we go ahead and make the changes. If it is
  // already locked, then we wait a bit and try again.

  const document = await (await client.db("diaform").collection("things").findOneAndUpdate({_id: userId.name}, {$set: {lock: true}})).value;

  if (document !== null && document.lock) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        resolve(await updateThings(userId, f));
      }, 20);
    });
  }

  let things = D.empty;

  if (document !== null) {
    // TODO: Throw more useful error when JSON cannot be parsed (maybe?).
    // TODO: Detect case where returned JSON parses correctly but is not valid.
    things = JSON.parse(document.json as string) as D.Things;
  }

  const newThings = f(things);

  if (newThings !== things) {
    await client.db("diaform").collection("things").replaceOne({_id: userId.name}, {_id: userId.name, json: JSON.stringify(newThings)}, {upsert: true});
    lastUpdates[userId.name] = new Date();
  }

  await client.db("diaform").collection("things").updateOne({_id: userId.name}, {$set: {lock: false}});

  return newThings;
}

export function lastUpdated(userId: UserId): Date | null {
  return lastUpdates[userId.name] ?? null;
}
