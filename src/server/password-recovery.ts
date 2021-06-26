import * as crypto from "crypto";

const staticUrl = process.env.DIAFORM_STATIC_HOST;

export type RecoveryResult<UserId> = {
  recoveryKey: {user: UserId; key: string} | null;
  email: {to: string; body: string} | null;
};

export type ResetResult<UsedId> = {
  isValid: boolean;
  user: UsedId | null;
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

  if (user === null) return {recoveryKey: null, email: null};

  const key = crypto.randomBytes(32).toString("base64");

  const body = `You requested to be sent this email because you forgot your password.\nTo recover your account, go to this URL: ${staticUrl}/recover-account.html\n\Use this secret Reset Key: ${key}\n\nThe key will expire in 2 hours.`;

  return {
    recoveryKey: {user: user.id, key},
    email: {to: user.email, body},
  };
}

export async function recover<UserId>(key: string, keys: RecoveryKeys<UserId>): Promise<ResetResult<UserId>> {
  const user = await keys.check(key);

  return {
    isValid: user !== null,
    user: user,
  };
}

export class InMemoryUsers implements Users<number> {
  private _users = new Map<number, {username: string; email: string}>();
  private _nextId = 1;

  add(args: {username: string; email: string}): number {
    const id = this._nextId;
    this._nextId += 1;
    this._users.set(id, args);
    return id;
  }

  async find(
    args: {email: string} | {username: string},
  ): Promise<null | {id: number; username: string; email: string}> {
    const matching = [...this._users.entries()].filter(([key, value]) =>
      "email" in args ? value.email === args.email : value.username === args.username,
    );

    if (matching.length === 0) return null;
    else return {id: matching[0][0], ...matching[0][1]};
  }
}
