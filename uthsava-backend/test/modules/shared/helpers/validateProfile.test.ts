/// <reference types="jest" />
import { validateProfile } from "../../../../src/modules/shared/helpers/validateProfile";
import { User } from "../../../../src/models";

// Mock User model
jest.mock("../../../../src/models", () => ({
  User: {
    findOne: jest.fn(),
  },
}));

describe("validateProfile Helper Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("[Validation] should throw error if acceptedTerms is false", async () => {
    await expect(
      validateProfile("test@example.com", "1234567890", "+1", 20, false)
    ).rejects.toThrow("auth.termsRequired");
  });

  it("[Validation] should throw error if email format is invalid", async () => {
    await expect(
      validateProfile("invalid-email", "1234567890", "+1", 20, true)
    ).rejects.toThrow("validation.emailInvalid");
  });

  it("[Validation] should throw error if age is less than 13", async () => {
    await expect(
      validateProfile("test@example.com", "1234567890", "+1", 12, true)
    ).rejects.toThrow("validation.ageInvalid");
  });

  it("[Validation] should throw error if age is greater than 120", async () => {
    await expect(
      validateProfile("test@example.com", "1234567890", "+1", 121, true)
    ).rejects.toThrow("validation.ageInvalid");
  });

  it("[Negative] should throw error if user with same mobile and countryCode exists for a DIFFERENT user", async () => {
    (User.findOne as jest.Mock)
      .mockResolvedValueOnce({ _id: "existing_user_id" }) // Mock mobile lookup
      .mockResolvedValueOnce(null); // Mock email lookup

    await expect(
      validateProfile("test@example.com", "1234567890", "+1", 20, true, "different_user_id")
    ).rejects.toThrow("user.exists");
  });

  it("[Positive] should allow existing user to update their own profile with same email", async () => {
    const existingUser = { _id: "same_user_id", email: "test@example.com" };
    (User.findOne as jest.Mock)
      .mockResolvedValueOnce(existingUser) // Mock mobile lookup
      .mockResolvedValueOnce(existingUser); // Mock email lookup

    const result = await validateProfile("test@example.com", "1234567890", "+1", 20, true, "same_user_id");
    expect(result).toEqual({ normalizedEmail: "test@example.com", existingUser });
  });

  it("[Positive] should allow existing user to update their email address to a new available email", async () => {
    const existingUser = { _id: "same_user_id", email: "original@example.com" };
    (User.findOne as jest.Mock)
      .mockResolvedValueOnce(existingUser) // Mock mobile lookup
      .mockResolvedValueOnce(null); // Mock email lookup

    const result = await validateProfile("newemail@example.com", "1234567890", "+1", 20, true, "same_user_id");
    expect(result).toEqual({ normalizedEmail: "newemail@example.com", existingUser });
  });

  it("[Negative] should throw error if user with same email exists", async () => {
    (User.findOne as jest.Mock)
      .mockResolvedValueOnce(null) // Mock mobile lookup
      .mockResolvedValueOnce({ _id: "existing_email_id" }); // Mock email lookup

    await expect(
      validateProfile("test@example.com", "1234567890", "+1", 20, true)
    ).rejects.toThrow("validation.email.exists");
  });

  it("[Positive] should return normalized email if validation checks pass", async () => {
    (User.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await validateProfile("Test@EXAMPLE.com", "1234567890", "+1", 25, true);

    expect(User.findOne).toHaveBeenNthCalledWith(1, { mobile: "1234567890", countryCode: "+1" });
    expect(User.findOne).toHaveBeenNthCalledWith(2, { email: "test@example.com" });
    expect(result).toEqual({ normalizedEmail: "test@example.com", existingUser: null });
  });
});
