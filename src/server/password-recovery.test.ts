/// <reference types="@types/jest" />

import * as PasswordRecovery from "./password-recovery";

const staticUrl = process.env.DIAFORM_STATIC_HOST;

const exampleUsers = new PasswordRecovery.InMemoryUsers();
exampleUsers.add({username: "test", email: "test@example.com"});
const testUserId = async () => (await exampleUsers.find({username: "test"}))!.id;

// [TODO] Test that key expires after 2 hours.

describe("the in-memory user store", () => {
  const users = new PasswordRecovery.InMemoryUsers();

  const user1 = users.add({username: "user1", email: "user1@example.com"});
  const user2 = users.add({username: "user2", email: "user2@example.com"});

  test("users have different IDs", () => {
    expect(user1).not.toEqual(user2);
  });

  test("looking up an existing user by email returns the ID, username and email", async () => {
    expect(await users.find({email: "user1@example.com"})).toEqual({
      id: user1,
      username: "user1",
      email: "user1@example.com",
    });
  });

  test("looking up an existing user by username returns the ID, username and email", async () => {
    expect(await users.find({username: "user1"})).toEqual({
      id: user1,
      username: "user1",
      email: "user1@example.com",
    });
  });

  test("looking up a non-existent user returns null", async () => {
    expect(await users.find({email: "invalid@example.com"})).toBeNull();
    expect(await users.find({username: "invalid"})).toBeNull();
  });
});

function correctRecovery(type: "email address" | "username") {
  describe(`recovering password with a correct ${type}`, () => {
    let generatedKey = "";

    describe("starting recovery", () => {
      const args = type === "email address" ? {email: "test@example.com"} : {username: "test"};
      const result = PasswordRecovery.start(args, exampleUsers);

      test("a new recovery key is generated", async () => {
        const {recoveryKey} = await result;
        expect(recoveryKey).not.toBeNull();
        generatedKey = recoveryKey?.key ?? "";
      });

      test("the recovery key is associated with the user account", async () => {
        const {recoveryKey} = await result;
        expect(recoveryKey?.user).toEqual(await testUserId());
      });

      test("an email is sent to the user's email address", async () => {
        const {email} = await result;
        expect(email?.to).toBe("test@example.com");
      });

      test("the email contains the recovery key", async () => {
        const {email, recoveryKey} = await result;
        expect(email?.body).toContain(recoveryKey?.key);
      });

      test("the email contains a link to the recovery page", async () => {
        const {email} = await result;
        expect(email?.body).toContain(`${staticUrl}/recover-account.html`);
      });
    });

    describe("resetting password", () => {
      const exampleRecoveryKeys = {
        async check(key: string): Promise<null | {id: number}> {
          return key === generatedKey ? await testUserId() : null;
        },
      };

      describe("with the generated recovery key and the correct user", () => {
        test("causes the password for the given user to be updated", async () => {
          const result = PasswordRecovery.recover(
            {key: generatedKey, user: await testUserId(), password: "newPassword"},
            exampleRecoveryKeys,
          );

          expect((await result).setPassword?.user).toEqual(await testUserId());
          expect((await result).setPassword?.password).toBe("newPassword");
        });
      });

      describe("with a fake recovery key", () => {
        test("does not update the password", async () => {
          const result = PasswordRecovery.recover(
            {key: "invalid", user: await testUserId(), password: "newPassword"},
            exampleRecoveryKeys,
          );

          expect((await result).setPassword).toBeNull();
        });
      });

      describe("with a different user ID", () => {
        test("does not update the password", async () => {
          const result = PasswordRecovery.recover(
            {key: generatedKey, user: {id: 200}, password: "newPassword"},
            exampleRecoveryKeys,
          );

          expect((await result).setPassword).toBeNull();
        });
      });
    });
  });
}

correctRecovery("email address");
correctRecovery("username");

test("the same recovery key is not generated twice", async () => {
  const result1 = await PasswordRecovery.start({email: "test@example.com"}, exampleUsers);
  const result2 = await PasswordRecovery.start({email: "test@example.com"}, exampleUsers);

  expect(result1.recoveryKey?.key).not.toBe(result2.recoveryKey?.key);
});
