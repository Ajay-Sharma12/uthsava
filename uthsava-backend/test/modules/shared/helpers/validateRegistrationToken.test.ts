/// <reference types="jest" />
import { validateRegistrationToken } from "../../../../src/modules/shared/helpers/validateRegistrationToken";
import { AuthService } from "../../../../src/modules/auth";

// Mock AuthService
jest.mock("../../../../src/modules/auth", () => ({
  AuthService: {
    verifyRegistrationToken: jest.fn(),
  },
}));

describe("validateRegistrationToken Helper Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("[Negative] should propagate error if verifyRegistrationToken throws", () => {
    (AuthService.verifyRegistrationToken as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token signature");
    });

    expect(() =>
      validateRegistrationToken("token123", "1234567890", "+1")
    ).toThrow("Invalid token signature");
  });

  it("[Validation] should throw error if decoded mobile or countryCode does not match parameter", () => {
    (AuthService.verifyRegistrationToken as jest.Mock).mockReturnValue({
      mobile: "1111111111",
      countryCode: "+1",
    });

    expect(() =>
      validateRegistrationToken("token123", "2222222222", "+1")
    ).toThrow("Registration token does not match mobile number");
  });

  it("[Positive] should return decoded payload if verification matches mobile and countryCode", () => {
    const payload = { mobile: "1234567890", countryCode: "+1" };
    (AuthService.verifyRegistrationToken as jest.Mock).mockReturnValue(payload);

    const result = validateRegistrationToken("token123", "1234567890", "+1");

    expect(AuthService.verifyRegistrationToken).toHaveBeenCalledWith("token123");
    expect(result).toEqual(payload);
  });
});
