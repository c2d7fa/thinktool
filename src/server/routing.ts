import * as express from "express";

export function body<T>(
  request: express.Request,
  response: express.Response,
  name: string,
  check: (x: unknown) => x is T,
  opts?: {optional?: boolean},
): T | null {
  try {
    if (typeof request.body !== "object") throw null;
    if (!(name in request.body)) throw null;
    if (check(request.body[name])) {
      return request.body[name];
    }
    throw null;
  } catch (e) {
    if (!opts?.optional) {
      response.sendStatus(400);
    }
    return null;
  }
}

export function isString(opts?: {maxLength: number}): (x: unknown) => x is string {
  return (x: unknown): x is string => {
    if (typeof x !== "string") return false;
    if (opts?.maxLength && x.length > opts.maxLength) return false;
    return true;
  };
}
