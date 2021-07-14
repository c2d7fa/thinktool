/// <reference types="@types/jest" />

import {subscribe, unsubscribe} from "./newsletter";

describe("when subscribing to the newsletter for the first time", () => {
  const subscribeResult = subscribe("test@example.com", {
    async getKey(args: {email: string}) {
      return null;
    },

    async getEmail(args: {key: string}) {
      return null;
    },
  });

  test("the email is added to the subscriber list", async () => {
    expect((await subscribeResult).addSubscription?.email).toBe("test@example.com");
  });

  test("an unsubscription key is saved", async () => {
    expect((await subscribeResult).addSubscription?.key).toBeDefined();
  });

  test("a confirmation email is sent", async () => {
    expect((await subscribeResult).email?.to).toBe("test@example.com");
    expect((await subscribeResult).email?.subject).toBe("Newsletter Confirmation");
  });

  test("the email contains the unsubscription key", async () => {
    expect((await subscribeResult).email?.message).toContain((await subscribeResult).addSubscription?.key);
  });

  describe("when unsubscribing from the newsletter with the key from the email", () => {
    const unsubscribeResult = async () => {
      const key = (await subscribeResult).addSubscription!.key;
      return await unsubscribe(key, {
        async getKey({email}: {email: string}) {
          return email === "test@example.com" ? key : null;
        },

        async getEmail(args: {key: string}) {
          return args.key === key ? "test@example.com" : null;
        },
      });
    };

    test("that email address is unsubscribed", async () => {
      const key = (await subscribeResult).addSubscription!.key;
      expect((await unsubscribeResult()).removeSubscription).toEqual({key});
    });
  });
});

describe("after subscribing multiple times", () => {
  const subscribeResult = subscribe("test@example.com", {
    async getKey({email}: {email: string}) {
      return email === "test@example.com" ? "key123" : null;
    },

    async getEmail(args: {key: string}) {
      return args.key === "key123" ? "test@example.com" : null;
    },
  });

  test("the confirmation email mentions that you're already signed up", async () => {
    expect((await subscribeResult).email?.to).toBe("test@example.com");
    expect((await subscribeResult).email?.subject).toBe("Newsletter Confirmation");
    expect((await subscribeResult).email?.message).toContain("already subscribed");
  });

  test("the email contains the original unsubscription key", async () => {
    expect((await subscribeResult).email?.message).toContain("key123");
  });

  test("there is no subscription added the second time", async () => {
    expect((await subscribeResult).addSubscription).toBeUndefined();
  });
});

describe("when trying to unsubscribe with a non-existent key", () => {
  const unsubscribeScenario = async () =>
    unsubscribe("invalid", {
      async getKey(args: {email: string}) {
        return null;
      },

      async getEmail(args: {key: string}) {
        return null;
      },
    });

  test("no subscriptions are removed", async () => {
    expect((await unsubscribeScenario()).removeSubscription).toBeUndefined();
  });

  test("an error is returned", async () => {
    expect((await unsubscribeScenario()).error).toBe("invalid-unsubscribe");
  });
});
