/// <reference types="@types/jest" />

import * as PasswordRecovery from "./password-recovery";

const staticUrl = process.env.DIAFORM_STATIC_HOST;

const exampleUsers = new PasswordRecovery.InMemoryUsers();
exampleUsers.add({username: "test", email: "test@example.com"});
const testUserId = exampleUsers.find({username: "test"})!.id;

// [TODO] Test that key expires after 2 hours.

describe("the in-memory user store", () => {
  const users = new PasswordRecovery.InMemoryUsers();

  const user1 = users.add({username: "user1", email: "user1@example.com"});
  const user2 = users.add({username: "user2", email: "user2@example.com"});

  test("users have different IDs", () => {
    expect(user1).not.toEqual(user2);
  });

  test("looking up an existing user by email returns the ID, username and email", () => {
    expect(users.find({email: "user1@example.com"})).toEqual({
      id: user1,
      username: "user1",
      email: "user1@example.com",
    });
  });

  test("looking up an existing user by username returns the ID, username and email", () => {
    expect(users.find({username: "user1"})).toEqual({id: user1, username: "user1", email: "user1@example.com"});
  });

  test("looking up a non-existent user returns null", () => {
    expect(users.find({email: "invalid@example.com"})).toBeNull();
    expect(users.find({username: "invalid"})).toBeNull();
  });
});

function correctRecovery(type: "email address" | "username") {
  describe(`recovering password with a correct ${type}`, () => {
    let generatedKey = "";

    describe("starting recovery", () => {
      const args = type === "email address" ? {email: "test@example.com"} : {username: "test"};
      const {recoveryKey, email} = PasswordRecovery.start(args, exampleUsers);

      test("a new recovery key is generated", () => {
        expect(recoveryKey).not.toBeNull();
        generatedKey = recoveryKey?.key ?? "";
      });

      test("the recovery key is associated with the user account", () => {
        expect(recoveryKey?.user).toBe(testUserId);
      });

      test("an email is sent to the user's email address", () => {
        expect(email?.to).toBe("test@example.com");
      });

      test("the email contains the recovery key", () => {
        expect(email?.body).toContain(recoveryKey?.key);
      });

      test("the email contains a link to the recovery page", () => {
        expect(email?.body).toContain(`${staticUrl}/recover-account.html`);
      });
    });

    describe("resetting password", () => {
      const exampleRecoveryKeys = {
        check(key: string): null | number {
          return key === generatedKey ? 100 : null;
        },
      };

      describe("with the generated recovery key", () => {
        const result = PasswordRecovery.recover(generatedKey, exampleRecoveryKeys);

        test("it's allowed", () => {
          expect(result.isValid).toBeTruthy();
        });

        test("the recovery key is associated to the same user", () => {
          expect(result.user).toBe(100);
        });
      });

      describe("with a fake recovery key", () => {
        const result = PasswordRecovery.recover("fakekey", exampleRecoveryKeys);

        test("it's not allowed", () => {
          expect(result.isValid).toBeFalsy();
        });

        test("the recovery key is not associated with any user", () => {
          expect(result.user).toBeNull();
        });
      });
    });
  });
}

correctRecovery("email address");
correctRecovery("username");

test("the same recovery key is not generated twice", () => {
  const result1 = PasswordRecovery.start({email: "test@example.com"}, exampleUsers);
  const result2 = PasswordRecovery.start({email: "test@example.com"}, exampleUsers);

  expect(result1.recoveryKey?.key).not.toBe(result2.recoveryKey?.key);
});
