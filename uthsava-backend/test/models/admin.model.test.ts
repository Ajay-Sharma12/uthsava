/// <reference types="jest" />
import { User } from "../../src/models/user.model";
import { Role } from "../../src/common/types/auth.types";

// Mock the User model discriminator to avoid real DB connections
jest.mock("../../src/models/user.model", () => {
  const mockDiscriminator = jest.fn().mockReturnValue({});
  return {
    User: {
      discriminator: mockDiscriminator,
    },
  };
});

describe("Admin / SubAdmin Model Discriminator Registration", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should register Admin discriminator with Role.ADMIN", () => {
    // Re-import to trigger the discriminator call
    jest.isolateModules(() => {
      const { Admin } = require("../../src/models/admin.model");
      expect(User.discriminator).toHaveBeenCalledWith(
        Role.ADMIN,
        expect.objectContaining({ paths: expect.anything() })
      );
    });
  });

  it("[Positive] should register SubAdmin discriminator with Role.ADMIN_SUB_USER", () => {
    jest.isolateModules(() => {
      require("../../src/models/admin.model");
      expect(User.discriminator).toHaveBeenCalledWith(
        Role.ADMIN_SUB_USER,
        expect.objectContaining({ paths: expect.anything() })
      );
    });
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should not register discriminator with wrong role key", () => {
    jest.isolateModules(() => {
      require("../../src/models/admin.model");
      const calls = (User.discriminator as jest.Mock).mock.calls.map((c: any[]) => c[0]);
      expect(calls).not.toContain("SUB_ADMIN");
      expect(calls).not.toContain("super_admin");
    });
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should call discriminator exactly twice (Admin + SubAdmin)", () => {
    (User.discriminator as jest.Mock).mockClear();
    jest.isolateModules(() => {
      require("../../src/models/admin.model");
      expect(User.discriminator).toHaveBeenCalledTimes(2);
    });
  });
});
