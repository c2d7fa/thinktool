import {Email} from "./mail";
import * as crypto from "crypto";

export interface Result {
  addSubscription?: {email: string; key: string};
  removeSubscription?: {key: string};
  email?: Email;
  error?: "invalid-unsubscribe";
}

export interface Service {
  getKey(args: {email: string}): Promise<string | null>;
  getEmail(args: {key: string}): Promise<string | null>;
}

export async function subscribe(email: string, service: Service): Promise<Result> {
  const preexistingKey = await service.getKey({email});

  if (preexistingKey !== null) {
    return {
      email: {
        to: email,
        subject: "Newsletter Confirmation",
        message: `You were already subscribed to the Thinktool newsletter.\n\nTo unsubscribe, follow this link: https://api.thinktool.io/unsubscribe?key=${preexistingKey}`,
      },
    };
  } else {
    const key = await new Promise<string>((resolve, reject) => {
      crypto.randomBytes(12, (err, buffer) => {
        if (err) reject(err);
        resolve(buffer.toString("hex"));
      });
    });
    return {
      addSubscription: {email, key},
      email: {
        to: email,
        subject: "Newsletter Confirmation",
        message: `You've been subscribed to the Thinktool newsletter.\n\nTo unsubscribe, follow this link: https://api.thinktool.io/unsubscribe?key=${key}`,
      },
    };
  }
}

export async function unsubscribe(key: string, service: Service): Promise<Result> {
  const email = await service.getEmail({key});

  if (email === null) {
    return {error: "invalid-unsubscribe"};
  } else {
    return {removeSubscription: {key}};
  }
}
