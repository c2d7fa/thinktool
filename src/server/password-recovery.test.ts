/// <reference types="@types/jest" />

import * as PasswordRecovery from "./password-recovery";

const staticUrl = process.env.DIAFORM_STATIC_HOST;

const exampleUsers = {
  find({email}: {email: string}): number | null {
    return email === "test@example.com" ? 100 : null;
  },
};

// [TODO] Test that key expires after 2 hours.

describe("recovering password with a correct email address", () => {
  let generatedKey = "";

  describe("starting recovery", () => {
    const {recoveryKey, email} = PasswordRecovery.start({email: "test@example.com"}, exampleUsers);

    test("a new recovery key is generated", () => {
      expect(recoveryKey).not.toBeNull();
      generatedKey = recoveryKey?.key ?? "";
    });

    test("the recovery key is associated with the user account", () => {
      expect(recoveryKey?.user).toBe(100);
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

test("the same recovery key is not generated twice", () => {
  const result1 = PasswordRecovery.start({email: "test@example.com"}, exampleUsers);
  const result2 = PasswordRecovery.start({email: "test@example.com"}, exampleUsers);

  expect(result1.recoveryKey?.key).not.toBe(result2.recoveryKey?.key);
});
