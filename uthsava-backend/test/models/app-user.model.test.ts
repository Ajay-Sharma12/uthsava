/// <reference types="jest" />
import { User } from "../../src/models/user.model";
import { Role } from "../../src/common/types/auth.types";

jest.mock("../../src/models/user.model", () => {
  const mockDiscriminator = jest.fn().mockReturnValue({});
  return {
    User: {
      discriminator: mockDiscriminator,
    },
  };
});

describe("AppUser Model Discriminator Registration", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should register AppUser discriminator with Role.USER", () => {
    jest.isolateModules(() => {
      require("../../src/models/app-user.model");
      expect(User.discriminator).toHaveBeenCalledWith(
        Role.USER,
        expect.objectContaining({ paths: expect.anything() })
      );
    });
  });

  it("[Positive] should call discriminator exactly once", () => {
    (User.discriminator as jest.Mock).mockClear();
    jest.isolateModules(() => {
      require("../../src/models/app-user.model");
      expect(User.discriminator).toHaveBeenCalledTimes(1);
    });
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should not register discriminator with Role.ADMIN", () => {
    (User.discriminator as jest.Mock).mockClear();
    jest.isolateModules(() => {
      require("../../src/models/app-user.model");
      const calls = (User.discriminator as jest.Mock).mock.calls.map((c: any[]) => c[0]);
      expect(calls).not.toContain(Role.ADMIN);
    });
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should pass Schema instance as second argument", () => {
    (User.discriminator as jest.Mock).mockClear();
    jest.isolateModules(() => {
      require("../../src/models/app-user.model");
      const secondArg = (User.discriminator as jest.Mock).mock.calls[0][1];
      expect(secondArg).toHaveProperty("paths");
      expect(secondArg).toHaveProperty("obj");
    });
  });
});
