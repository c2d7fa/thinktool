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
  if ((await client.db("diaform").collection("users").find({_id: userId.name}).count()) > 0) {
    return userId.name;
  } else {
    return null;
  }
}

export async function createUser(
  user: string,
  password: string,
): Promise<{type: "success"; userId: UserId} | {type: "error"; error?: "user-exists"}> {
  if ((await client.db("diaform").collection("users").find({_id: user}).count()) > 0) {
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
): Promise<{
  things: {name: string; content: string; children: {name: string; child: string; tag?: string}[]}[];
}> {
  // We want to join the with connections, putting the relevant connections
  // inline in the returned array. We use a hack where we start by replacing
  // all connections with the correct name, then narrow down to just the
  // connections from the correct user. This kinda makes me wish I had just gone
  // with SQL...
  const things = await client
    .db("diaform")
    .collection("things")
    .aggregate([
      {$match: {user: userId.name}},
      // Replace "connections" with inline "children", which now contains *all*
      // connections with the same name, whether or not they are by the same
      // user!
      {
        $lookup: {
          from: "connections",
          localField: "connections",
          foreignField: "name",
          as: "children",
        },
      },
      // Filter to connections by the correct user.
      {
        $project: {
          _id: 0,
          name: 1,
          content: 1,
          children: {
            $filter: {input: "$children", as: "child", cond: {$eq: ["$$child.user", userId.name]}},
          },
        },
      },
      {$project: {_id: 0, name: 1, content: 1, children: {user: 1, name: 1, child: 1, tag: 1}}},
    ])
    .toArray();
  return {things};
}

export async function thingExists(userId: UserId, thing: string): Promise<boolean> {
  return (await client.db("diaform").collection("things").find({user: userId.name, name: thing}).count()) > 0;
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
  // Create/update child connections
  for (const connection of children) {
    await client
      .db("diaform")
      .collection("connections")
      .updateOne(
        {user: userId.name, name: connection.name},
        {$set: {parent: thing, child: connection.child, tag: connection.tag}},
        {upsert: true},
      );
    if (connection.tag === undefined) {
      await client
        .db("diaform")
        .collection("connection")
        .updateOne({user: userId.name, name: connection.name}, {$unset: {tag: ""}});
    }
  }

  // Remove old connections
  await client
    .db("diaform")
    .collection("connections")
    .deleteMany({user: userId.name, parent: thing, name: {$nin: children.map((c) => c.name)}});

  // Update the item itself
  await client
    .db("diaform")
    .collection("things")
    .updateOne(
      {user: userId.name, name: thing},
      {$set: {content, connections: children.map((ch) => ch.name)}},
      {upsert: true},
    );
}

export async function deleteThing(userId: UserId, thing: string): Promise<void> {
  await client.db("diaform").collection("things").deleteOne({user: userId.name, name: thing});

  await client.db("diaform").collection("connections").deleteMany({user: userId.name, child: thing});
  await client.db("diaform").collection("connections").deleteMany({user: userId.name, parent: thing});
  await client
    .db("diaform")
    .collection("connections")
    .updateMany({user: userId.name, tag: thing}, {$unset: {tag: ""}});
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
  const data = await client.db("diaform").collection("things").findOne({user: userId.name, name: thing});

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
  await client.db("diaform").collection("users").deleteOne({name: userId.name});
  await client.db("diaform").collection("things").deleteMany({user: userId.name});
  await client.db("diaform").collection("connections").deleteMany({user: userId.name});
}
