import * as lockfile from "lockfile";
import * as myfs from "./myfs";
import * as mongo from "mongodb";

import * as D from "../data";

export type UserId = {name: string};

// This is a hack. We require the consumer of this module to call initialize()
// before doing anything else.
let client: mongo.MongoClient = undefined as never;

export async function initialize(uri: string): Promise<void> {
  client = await new mongo.MongoClient(uri, {useUnifiedTopology: true}).connect();
}

export interface Users {
  nextId: number;
  users: {[name: string]: {password: string; id: number}};
}

export async function getUsers(): Promise<Users> {
  const content = await myfs.readFile(`../../data/users.json`);
  if (content === undefined) {
    return {nextId: 0, users: {}};
  } else {
    return JSON.parse(content.toString());
  }
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
  // TODO: This lock file system is horrible implementation of a bad idea. We
  // should probably do something completely different here, but I'm not quite
  // sure what.

  // TODO: Detect case where returned JSON parses correctly but is not valid.
  return new Promise((resolve, reject) => (async () => {  // TODO: Does this even make sense? Seems to work 🤷
    lockfile.lock(`../../data/.${userId.name}.json.lock`, {wait: 100}, async (err) => {
      if (err)
        return resolve(updateThings(userId, f));  // TODO: Yikes (we do this to avoid EEXIST error)
      const content = await myfs.readFile(`../../data/${userId.name}.json`);
      let things = D.empty;
      if (content !== undefined) {
        try {
          things = JSON.parse(content);
        } catch (e) {
          console.warn(`Got error while parsing JSON for user ${userId} (%o): %o`, content, e);
        }
      }
      const newThings = f(things);
      if (newThings !== things) {
        await myfs.writeFile(`../../data/${userId.name}.json`, JSON.stringify(newThings));
        lastUpdates[userId.name] = new Date();
      }
      lockfile.unlockSync(`../../data/.${userId.name}.json.lock`);
      resolve(newThings);
    });
  })());
}

export function lastUpdated(userId: UserId): Date | null {
  return lastUpdates[userId.name] ?? null;
}
