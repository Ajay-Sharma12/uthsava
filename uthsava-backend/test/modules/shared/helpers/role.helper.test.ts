import { RoleHelper } from "../../../../src/modules/shared/helpers/role.helper";
import { Role } from "../../../../src/common/types/auth.types";

describe("RoleHelper Unit Tests", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should format Admin role correctly", () => {
    expect(RoleHelper.formatRole(Role.ADMIN)).toBe("Admin");
  });

  it("[Positive] should format Producer role correctly", () => {
    expect(RoleHelper.formatRole(Role.PRODUCER)).toBe("Producer");
  });

  it("[Positive] should format User role correctly", () => {
    expect(RoleHelper.formatRole(Role.USER)).toBe("User");
  });

  it("[Positive] should format Sub Admin role correctly", () => {
    expect(RoleHelper.formatRole(Role.ADMIN_SUB_USER)).toBe("Sub Admin");
  });

  /* =========================================================================
   * EDGE / NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Edge] should return the original value if an unmapped role string is passed", () => {
    expect(RoleHelper.formatRole("GUEST" as Role)).toBe("GUEST");
  });
});
