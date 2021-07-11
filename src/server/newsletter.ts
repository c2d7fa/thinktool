import {Email} from "./mail";

export interface Result {
  addSubscription?: {email: string; key: string};
  removeSubscription?: {key: string};
  email?: Email;
  error?: "invalid-unsubscribe";
}

export interface Service {
  getKey(key: string): Promise<string | null>;
}

export async function subscribe(email: string, service: Service): Promise<Result> {
  return {};
}

export async function unsubscribe(key: string, service: Service): Promise<Result> {
  return {};
}
