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
  const documents = client.db("diaform").collection("things").find({user: userId.name});

  if (await documents.count() === 0)
    return D.empty;

  const things = {};
  await documents.forEach((document) => {
    things[document.name] = {content: document.content ?? "", children: document.children ?? [], page: document.page};
  });
  return {things} as D.Things;
}

export async function putThing(userId: UserId, thing: string, thingData: D.ThingData): Promise<void> {
  await client.db("diaform").collection("things").replaceOne({user: userId.name, name: thing}, {user: userId.name, name: thing, ...thingData}, {upsert: true});
  lastUpdates[userId.name] = new Date();
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  await client.db("diaform").collection("things").deleteOne({user: userId.name, name: thing});
  lastUpdates[userId.name] = new Date();
}

export async function setContent(userId: UserId, thing: string, content: string): Promise<void> {
  console.log(userId);
  await client.db("diaform").collection("things").updateOne({user: userId.name, name: thing}, {$set: {content}}, {upsert: true});
  lastUpdates[userId.name] = new Date();
}

export async function setPage(userId: UserId, thing: string, page: string | null): Promise<void> {
  await client.db("diaform").collection("things").updateOne({user: userId.name, name: thing}, {$set: {page}}, {upsert: true});
  lastUpdates[userId.name] = new Date();
}

export function lastUpdated(userId: UserId): Date | null {
  return lastUpdates[userId.name] ?? null;
}
