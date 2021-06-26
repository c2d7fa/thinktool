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
  find(args: {email: string}): Id | null;
}

export interface RecoveryKeys<UserId> {
  check(key: string): UserId | null;
}

export function start<UserId>(args: {email: string}, users: Users<UserId>): RecoveryResult<UserId> {
  const user = users.find({email: args.email});

  if (user === null) return {recoveryKey: null, email: null};

  const key = crypto.randomBytes(32).toString("base64");

  const body = `You requested to be sent this email because you forgot your password.\nTo recover your account, go to this URL: ${staticUrl}/recover-account.html\n\Use this secret Reset Key: ${key}\n\nThe key will expire in 2 hours.`;

  return {
    recoveryKey: {user, key},
    email: {to: args.email, body},
  };
}

export function recover<UserId>(key: string, keys: RecoveryKeys<UserId>): ResetResult<UserId> {
  const user = keys.check(key);

  return {
    isValid: user !== null,
    user: user,
  };
}
