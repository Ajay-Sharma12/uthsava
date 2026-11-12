/// <reference types="jest" />
import jwt from "jsonwebtoken";
import { TokenService } from "../../../../src/modules/auth/services/token.service";
import { config } from "../../../../src/core/config";

// Mock jsonwebtoken to isolate TokenService unit tests
jest.mock("jsonwebtoken");

describe("TokenService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // refreshAccessToken Test Cases
  // ==========================================
  describe("refreshAccessToken", () => {
    it("should successfully refresh and return a new access token when a valid refresh token is provided", async () => {
      // Positive Case: Valid refresh token decoded and signed successfully
      const mockDecoded = { sub: "user-id-123", role: "user" };
      const mockAccessToken = "new-access-token-xyz";

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      (jwt.sign as jest.Mock).mockReturnValue(mockAccessToken);

      const result = await TokenService.refreshAccessToken("valid-refresh-token");

      expect(jwt.verify).toHaveBeenCalledWith(
        "valid-refresh-token",
        config.jwt.refreshSecret || "default_refresh_secret"
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: "user-id-123", role: "user" },
        config.jwt.accessSecret || "default_access_secret",
        expect.any(Object)
      );
      expect(result).toBe(mockAccessToken);
    });

    it("should throw an error if the refresh token verification fails", async () => {
      // Negative Case: Token verification throws an error (e.g. expired or invalid signature)
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await expect(TokenService.refreshAccessToken("invalid-token")).rejects.toThrow(
        "Invalid or expired refresh token"
      );
      expect(jwt.verify).toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it("should fallback to default secrets if config.jwt has undefined secrets", async () => {
      // Edge Case: Handling missing jwt secrets in config gracefully by falling back to default values
      const originalRefreshSecret = config.jwt.refreshSecret;
      const originalAccessSecret = config.jwt.accessSecret;
      
      // Temporarily set to undefined to trigger fallback code branches
      config.jwt.refreshSecret = undefined as any;
      config.jwt.accessSecret = undefined as any;

      const mockDecoded = { sub: "user-id-123", role: "user" };
      const mockAccessToken = "fallback-access-token";

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      (jwt.sign as jest.Mock).mockReturnValue(mockAccessToken);

      try {
        const result = await TokenService.refreshAccessToken("valid-refresh-token");
        
        expect(jwt.verify).toHaveBeenCalledWith("valid-refresh-token", "default_refresh_secret");
        expect(jwt.sign).toHaveBeenCalledWith(
          { sub: "user-id-123", role: "user" },
          "default_access_secret",
          expect.any(Object)
        );
        expect(result).toBe(mockAccessToken);
      } finally {
        // Restore config values after test completion
        config.jwt.refreshSecret = originalRefreshSecret;
        config.jwt.accessSecret = originalAccessSecret;
      }
    });
  });

  // ==========================================
  // verifyAccessToken Test Cases
  // ==========================================
  describe("verifyAccessToken", () => {
    it("should verify a valid access token and return decoded payload", () => {
      // Positive Case: Valid access token decoded and verified successfully
      const mockPayload = { sub: "user-123", role: "user" };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = TokenService.verifyAccessToken("valid-access-token");

      expect(jwt.verify).toHaveBeenCalledWith(
        "valid-access-token",
        config.jwt.accessSecret || "default_access_secret"
      );
      expect(result).toBe(mockPayload);
    });

    it("should throw an error if the access token verification fails", () => {
      // Negative Case: Access token verification throws an error due to expiration/tampering
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("TokenExpiredError");
      });

      expect(() => TokenService.verifyAccessToken("expired-access-token")).toThrow(
        "Invalid or expired access token"
      );
      expect(jwt.verify).toHaveBeenCalled();
    });

    it("should fallback to default access secret if config secret is missing", () => {
      // Edge Case: Handling missing config secret during access token verification
      const originalAccessSecret = config.jwt.accessSecret;
      config.jwt.accessSecret = undefined as any;

      (jwt.verify as jest.Mock).mockReturnValue({ sub: "user-123" });

      try {
        TokenService.verifyAccessToken("some-access-token");
        expect(jwt.verify).toHaveBeenCalledWith("some-access-token", "default_access_secret");
      } finally {
        // Restore config
        config.jwt.accessSecret = originalAccessSecret;
      }
    });
  });

  // ==========================================
  // decodeToken Test Cases
  // ==========================================
  describe("decodeToken", () => {
    it("should decode a token without verifying it", () => {
      // Positive Case: Decode token structure successfully
      const mockDecoded = { sub: "user-123", role: "user" };
      (jwt.decode as jest.Mock).mockReturnValue(mockDecoded);

      const result = TokenService.decodeToken("some-jwt-token");

      expect(jwt.decode).toHaveBeenCalledWith("some-jwt-token");
      expect(result).toBe(mockDecoded);
    });

    it("should return null/undefined for an invalid malformed token when decoding", () => {
      // Validation Case: Passing malformed token to decode should return null/undefined
      (jwt.decode as jest.Mock).mockReturnValue(null);

      const result = TokenService.decodeToken("malformed-token");

      expect(jwt.decode).toHaveBeenCalledWith("malformed-token");
      expect(result).toBeNull();
    });
  });
});
