import * as mongo from "mongodb";
import * as bcrypt from "bcrypt";

import * as Communication from "../shared/communication";

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

// Check password and return user ID.
export async function userId(name: string, password: string): Promise<UserId | null> {
  const user = await client
    .db("diaform")
    .collection("users")
    .findOne({_id: name});

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
  if (
    (await client
      .db("diaform")
      .collection("users")
      .find({_id: userId.name})
      .count()) > 0
  ) {
    return userId.name;
  } else {
    return null;
  }
}

export async function createUser(
  user: string,
  password: string,
): Promise<{type: "success"; userId: UserId} | {type: "error"; error?: "user-exists"}> {
  if (
    (await client
      .db("diaform")
      .collection("users")
      .find({_id: user})
      .count()) > 0
  ) {
    return {type: "error", error: "user-exists"};
  }

  const hashedPassword = await bcrypt.hash(password, 6);

  const result = await client
    .db("diaform")
    .collection("users")
    .insertOne({_id: user, name: user, hashedPassword});
  if (result.result.ok) {
    return {type: "success", userId: {name: user}};
  } else {
    return {type: "error"};
  }
}

export async function getFullState(
  userId: UserId,
): Promise<{name: string; content: string; children: string[]}[]> {
  const documents = await client
    .db("diaform")
    .collection("things")
    .find({user: userId.name})
    .map((t) => ({name: t.name, content: t.content ?? "", connections: t.connections ?? []}))
    .toArray();

  let result = [];

  for (const document of documents) {
    let children = [];
    for (const connection of document.connections) {
      const child = (
        await client
          .db("diaform")
          .collection("connections")
          .findOne({user: userId.name, name: connection})
      ).child;
      children.push(child);
    }
    result.push({name: document.name, content: document.content, children});
  }

  return result;
}

export async function thingExists(userId: UserId, thing: string): Promise<boolean> {
  return (
    (await client
      .db("diaform")
      .collection("things")
      .find({user: userId.name, name: thing})
      .count()) > 0
  );
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
  children: string[];
}): Promise<void> {
  // We receive a list of children from the client, but we want to insert
  // connections into the database. We handle this by first removing all
  // existing connections from the DB, and then recreating the new connections
  // from scratch.

  await client
    .db("diaform")
    .collection("connections")
    .deleteMany({user: userId.name, parent: thing});

  let connections = [];
  let i = 0;
  for (const child of children) {
    const connectionId = `${thing}.children.${i++}`;
    connections.push(connectionId);
    await client
      .db("diaform")
      .collection("connections")
      .insertOne({user: userId.name, name: connectionId, parent: thing, child});
  }

  await client
    .db("diaform")
    .collection("things")
    .updateOne({user: userId.name, name: thing}, {$set: {content, connections}}, {upsert: true});
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  await client
    .db("diaform")
    .collection("things")
    .deleteOne({user: userId.name, name: thing});
}

export async function setContent(userId: UserId, thing: string, content: string): Promise<void> {
  await client
    .db("diaform")
    .collection("things")
    .updateOne({user: userId.name, name: thing}, {$set: {content}}, {upsert: true});
}

export async function getThingData(
  userId: UserId,
  thing: string,
): Promise<{content: string; children: string[]}> {
  const data = await client
    .db("diaform")
    .collection("things")
    .findOne({user: userId.name, name: thing});

  const children = await client
    .db("diaform")
    .collection("connections")
    .find({user: userId.name, parent: thing})
    .map((c) => c.child)
    .toArray();
  console.log(children);

  return {content: data.content ?? "", children};
}

export async function deleteAllUserData(userId: UserId): Promise<void> {
  await client
    .db("diaform")
    .collection("users")
    .deleteOne({name: userId.name});
  await client
    .db("diaform")
    .collection("things")
    .deleteMany({user: userId.name});
  await client
    .db("diaform")
    .collection("connections")
    .deleteMany({user: userId.name});
}
