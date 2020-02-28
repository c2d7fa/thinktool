import * as mongo from "mongodb";
import * as bcrypt from "bcrypt";

import * as Communication from "../communication";

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
    if (await bcrypt.compare(password, user.hashedPassword as string)) {
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

  const hashedPassword = await bcrypt.hash(password, 6);

  const result = await client.db("diaform").collection("users").insertOne({_id: user, name: user, hashedPassword});
  if (result.result.ok) {
    return {type: "success", userId: {name: user}};
  } else {
    return {type: "error"};
  }
}

export async function getAllThings(userId: UserId): Promise<{name: string; content?: string; children?: string[]}[]> {
  const documents = client.db("diaform").collection("things").find({user: userId.name});
  return documents.project({name: 1, content: 1, children: 1, _id: 0}).toArray();
}

export async function thingExists(userId: UserId, thing: string): Promise<boolean> {
  return await client.db("diaform").collection("things").find({user: userId.name, name: thing}).count() > 0;
}

export async function updateThing(userId: UserId, thing: string, content: string, children: string[]): Promise<void> {
  await client.db("diaform").collection("things").updateOne({user: userId.name, name: thing}, {$set: {content, children}}, {upsert: true});
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  await client.db("diaform").collection("things").deleteOne({user: userId.name, name: thing});
}

export async function setContent(userId: UserId, thing: string, content: string): Promise<void> {
  await client.db("diaform").collection("things").updateOne({user: userId.name, name: thing}, {$set: {content}}, {upsert: true});
}

export async function getThingData(userId: UserId, thing: string): Promise<Communication.ThingData> {
  const data = await client.db("diaform").collection("things").findOne({user: userId.name, name: thing});
  return {content: data.content ?? "", children: data.children ?? []};
}
