import * as lockfile from "lockfile";
import * as myfs from "./myfs";
import * as fs from "fs";

import * as D from "../data";

fs.mkdirSync("../../data", {recursive: true});

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

export async function getUser(user: string): Promise<{password: string; id: number} | null> {
  const userData = await getUsers();
  if (userData.users[user] === undefined)
    return null;
  return userData.users[user];
}

// Check password and return user ID.
export async function userId(user: string, password: string): Promise<number | null> {
  const userData = await getUser(user);
  if (userData === null)
    return null;
  if (userData.password !== password)
    return null;
  return userData.id;
}

export async function userName(userId: number): Promise<string | null> {
  const users = await getUsers();
  for (const name in users.users)
    if (users.users[name].id === userId)
      return name;
  return null;
}

// TODO: What happens if this gets called from multiple locations at the same
// time?
export async function createUser(user: string, password: string): Promise<{type: "success"; userId: number} | {type: "error"; error: "user-exists"}> {
  const users = await getUsers();
  if (users.users[user] !== undefined)
    return {type: "error", error: "user-exists"};
  const newUsers = {...users, nextId: users.nextId + 1, users: {...users.users, [user]: {id: users.nextId, password}}};
  await myfs.writeFile("../../data/users.json", JSON.stringify(newUsers));
  return {type: "success", userId: users.nextId};
}

// We want to be able to know when a user's data was last updated. This is used
// to figure out if we need to send an update to a client or not; we send
// updates when the last update was later than the last read from the client.

const lastUpdates: {[userId: number]: Date | undefined} = {};

export async function getThings(userId: number): Promise<D.Things> {
  return await updateThings(userId, x => x);
}

export async function putThings(userId: number, things: D.Things): Promise<void> {
  await updateThings(userId, _ => things);
}

export async function updateThings(userId: number, f: (data: D.Things) => D.Things): Promise<D.Things> {
  // TODO: This lock file system is horrible implementation of a bad idea. We
  // should probably do something completely different here, but I'm not quite
  // sure what.

  // TODO: Detect case where returned JSON parses correctly but is not valid.
  return new Promise((resolve, reject) => (async () => {  // TODO: Does this even make sense? Seems to work 🤷
    lockfile.lock(`../../data/.data${userId}.json.lock`, {wait: 100}, async (err) => {
      if (err)
        return resolve(updateThings(userId, f));  // TODO: Yikes (we do this to avoid EEXIST error)
      const content = await myfs.readFile(`../../data/data${userId}.json`);
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
        await myfs.writeFile(`../../data/data${userId}.json`, JSON.stringify(newThings));
        lastUpdates[userId] = new Date();
      }
      lockfile.unlockSync(`../../data/.data${userId}.json.lock`);
      resolve(newThings);
    });
  })());
}

export function lastUpdated(userId: number): Date | null {
  return lastUpdates[userId] ?? null;
}
