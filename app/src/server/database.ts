import * as mongo from "mongodb";

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

export async function getAllThings(userId: UserId): Promise<{name: string; content?: string; page?: string; children?: string[]}[]> {
  const documents = client.db("diaform").collection("things").find({user: userId.name});
  return documents.project({name: 1, content: 1, children: 1, page: 1, _id: 0}).toArray();
}

export async function thingExists(userId: UserId, thing: string): Promise<boolean> {
  return await client.db("diaform").collection("things").find({user: userId.name, name: thing}).count() > 0;
}

export async function updateThing(userId: UserId, thing: string, content: string, page: string | null, children: string[]): Promise<void> {
  const operation = page === null ? {$set: {content, children}, $unset: {page}} : {$set: {content, children, page}};
  await client.db("diaform").collection("things").updateOne({user: userId.name, name: thing}, operation, {upsert: true});
  lastUpdates[userId.name] = new Date();
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  await client.db("diaform").collection("things").deleteOne({user: userId.name, name: thing});
  lastUpdates[userId.name] = new Date();
}

export async function setContent(userId: UserId, thing: string, content: string): Promise<void> {
  await client.db("diaform").collection("things").updateOne({user: userId.name, name: thing}, {$set: {content}}, {upsert: true});
  lastUpdates[userId.name] = new Date();
}

export async function setPage(userId: UserId, thing: string, page: string | null): Promise<void> {
  const operator = page === null ? {$unset: {page}} : {$set: {page}};
  await client.db("diaform").collection("things").updateOne({user: userId.name, name: thing}, operator, {upsert: true});
  lastUpdates[userId.name] = new Date();
}

export function lastUpdated(userId: UserId): Date | null {
  return lastUpdates[userId.name] ?? null;
}
