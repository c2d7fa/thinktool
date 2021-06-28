import * as crypto from "crypto";
import * as Database from "./database";

const staticUrl = process.env.DIAFORM_STATIC_HOST;

export type RecoveryResult<UserId> = {
  recoveryKey: {user: UserId; key: string} | null;
  email: {to: string; body: string} | null;
};

export type ResetResult<UserId> = {
  setPassword: null | {user: UserId; password: string};
};

export interface Users<Id> {
  find(args: {email: string} | {username: string}): Promise<{id: Id; username: string; email: string} | null>;
}

export interface RecoveryKeys<UserId> {
  check(key: string): Promise<UserId | null>;
}

export async function start<UserId>(
  args: {email: string} | {username: string},
  users: Users<UserId>,
): Promise<RecoveryResult<UserId>> {
  const user =
    "email" in args ? await users.find({email: args.email}) : await users.find({username: args.username});

  if (user === null) {
    if ("username" in args) return {recoveryKey: null, email: null};
    else
      return {
        recoveryKey: null,
        email: {
          to: args.email,
          body: `You or someone else tried to recover a Thinktool (https://thinktool.io/) account associated with this email address. However, there is no account associated with this email address.\n\nIf you didn't try to recover your account, you can safely ignore this email.`,
        },
      };
  }

  const key = crypto.randomBytes(32).toString("base64");

  const body = `You requested to be sent this email because you forgot your password.\nTo recover your account, go to this URL: ${staticUrl}/recover-account.html\n\Use this secret Reset Key: ${key}\n\nThe key will expire in 2 hours.`;

  return {
    recoveryKey: {user: user.id, key},
    email: {to: user.email, body},
  };
}

export async function recover<UserId>(
  {user, key, password}: {user: UserId; key: string; password: string},
  keys: RecoveryKeys<UserId>,
): Promise<ResetResult<UserId>> {
  const userKey = await keys.check(key);

  if (userKey === null || JSON.stringify(userKey) !== JSON.stringify(user)) return {setPassword: null};

  return {
    setPassword: {
      user,
      password,
    },
  };
}

export class InMemoryUsers implements Users<{id: number}> {
  private _users = new Map<number, {username: string; email: string}>();
  private _nextId = 1;

  add(args: {username: string; email: string}): {id: number} {
    const id = this._nextId;
    this._nextId += 1;
    this._users.set(id, args);
    return {id};
  }

  async find(
    args: {email: string} | {username: string},
  ): Promise<null | {id: {id: number}; username: string; email: string}> {
    const matching = [...this._users.entries()].filter(([key, value]) =>
      "email" in args ? value.email === args.email : value.username === args.username,
    );

    if (matching.length === 0) return null;
    else return {id: {id: matching[0][0]}, ...matching[0][1]};
  }
}

export const databaseUsers: Users<{name: string}> = {
  async find(
    args: {email: string} | {username: string},
  ): Promise<null | {id: {name: string}; username: string; email: string}> {
    if ("username" in args) {
      const email = await Database.getEmail({name: args.username});
      if (email === null) return null;
      return {id: {name: args.username}, username: args.username, email};
    } else {
      const user = await Database.userWithEmail(args.email);
      if (user === null) return null;
      return {id: user, username: user.name, email: args.email};
    }
  },
};

export const databaseKeys: RecoveryKeys<{name: string}> = {
  async check(key: string): Promise<{name: string} | null> {
    return await Database.userForResetKey(key);
  },
};
