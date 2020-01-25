import * as lockfile from "lockfile";
import * as myfs from "./myfs";

import * as D from "../data";

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
