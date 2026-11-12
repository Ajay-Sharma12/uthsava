import { User, UserStatus, Gender } from "../../src/models/user.model";
import { Role } from "../../src/common/types/auth.types";

describe("User Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all correct/optional fields", () => {
    const validUser = new User({
      userId: 1,
      email: "test@example.com",
      role: Role.USER,
      firstName: "John",
      lastName: "Doe",
      fullName: "John Doe",
      gender: Gender.MALE,
      status: UserStatus.ACTIVE,
      notificationEnabled: true,
    });

    const validationError = validUser.validateSync();
    expect(validationError).toBeUndefined();
    expect(validUser.email).toBe("test@example.com");
    expect(validUser.status).toBe(UserStatus.ACTIVE);
  });

  it("[Positive] should initialize correct defaults", () => {
    const user = new User({
      userId: 2,
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();
    expect(user.role).toBe(Role.USER);
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.notificationEnabled).toBe(true);
    expect(user.isEmailVerified).toBe(false);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if role is set to an invalid value", () => {
    const invalidUser = new User({
      userId: 3,
      role: "invalid-role" as any,
    });

    const validationError = invalidUser.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["role"]).toBeDefined();
    expect(validationError?.errors["role"].message).toContain("is not a valid enum value");
  });

  it("[Negative] should fail validation if status is set to an invalid value", () => {
    const invalidUser = new User({
      userId: 4,
      status: "invalid-status" as any,
    });

    const validationError = invalidUser.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["status"]).toBeDefined();
    expect(validationError?.errors["status"].message).toContain("is not a valid enum value");
  });

  /* =========================================================================
   * EDGE & VALIDATION TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if fullName is too short", () => {
    const invalidUser = new User({
      userId: 5,
      fullName: "A", // too short (min length 2)
    });

    const validationError = invalidUser.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["fullName"]).toBeDefined();
    expect(validationError?.errors["fullName"].message).toContain("shorter than the minimum allowed length");
  });

  it("[Validation] should fail validation if gender is not one of the enum values", () => {
    const invalidUser = new User({
      userId: 6,
      gender: "unspecified" as any,
    });

    const validationError = invalidUser.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["gender"]).toBeDefined();
  });
});
