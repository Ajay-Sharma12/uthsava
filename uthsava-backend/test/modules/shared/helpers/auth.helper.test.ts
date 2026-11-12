import { Request } from "express";
import { updateUserLoginInfo, buildUserResponse } from "../../../../src/modules/shared/helpers/auth.helper";

describe("Auth Helper Unit Tests", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  describe("updateUserLoginInfo", () => {
    it("[Positive] should successfully update user login and device info", async () => {
      const mockUser = {
        _id: "60c72b2f9b1d8a25c88c9f12",
        deviceId: "old-device",
        deviceType: "Mobile",
        deviceToken: "old-token",
        save: jest.fn().mockResolvedValue(true),
      };

      const mockReq = {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
          "user-agent": "Mozilla/5.0",
        },
      } as unknown as Request;

      const deviceData = {
        deviceId: "new-device",
        deviceType: "Tablet",
        deviceToken: "new-token",
      };

      await updateUserLoginInfo(mockUser, mockReq, deviceData);

      expect(mockUser.deviceId).toBe("new-device");
      expect(mockUser.deviceType).toBe("Tablet");
      expect(mockUser.deviceToken).toBe("new-token");
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("[Positive] should build correct user response payload structure", () => {
      const user = {
        _id: "user123",
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        mobile: "1234567890",
        countryCode: 1,
        profileImage: "avatar.png",
        role: "USER",
        status: "ACTIVE",
        userId: "UID-100",
        notificationEnabled: true,
      };

      const tokens = { accessToken: "access-token-123" };

      const response = buildUserResponse(user, tokens, 1);

      expect(response).toEqual({
        isNewUser: 1,
        expiresIn: "60d",
        token: "access-token-123",
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        mobile: "1234567890",
        countryCode: 1,
        profileImage: "avatar.png",
        role: "USER",
        status: "ACTIVE",
        userId: "UID-100",
        _id: "user123",
        age: null,
        gender: null,
        deviceId: null,
        deviceType: null,
        deviceToken: null,
        notificationEnabled: true,
      });
    });
  });

  /* =========================================================================
   * NEGATIVE / VALIDATION TEST CASES
   * ========================================================================= */
  describe("updateUserLoginInfo Fallback Handling", () => {
    it("[Negative] should fallback to req.ip or unknown if x-forwarded-for header is absent", async () => {
      const mockUser = {
        save: jest.fn().mockResolvedValue(true),
      };

      const mockReq = {
        headers: {},
        ip: "127.0.0.1",
      } as unknown as Request;

      await updateUserLoginInfo(mockUser, mockReq, {});

      const updatedUser = mockUser as any;
      expect(updatedUser.lastLoginIp).toBe("127.0.0.1");
    });
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  describe("updateUserLoginInfo Edge Cases", () => {
    it("[Edge] should generate a resolved default deviceId if not provided in user or payload", async () => {
      const mockUser = {
        _id: "60c72b2f9b1d8a25c88c9f12",
        save: jest.fn().mockResolvedValue(true),
      };

      const mockReq = {
        headers: {},
      } as unknown as Request;

      await updateUserLoginInfo(mockUser, mockReq, {});

      const updatedUser = mockUser as any;
      // Should extract last 6 characters of user._id or fallback: 60c72b2f9b1d8a25c88c9f12 -> 8c9f12
      expect(updatedUser.deviceId).toBe("DEV-8c9f12");
    });
  });
});
