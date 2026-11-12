import { Request } from "express";

const mockFindOneAndUpdate = jest.fn().mockResolvedValue({});

jest.mock("../../../../src/models", () => ({
  UserSession: {
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));

import { saveUserSession } from "../../../../src/modules/shared/helpers/saveUserSession";

describe("saveUserSession Helper Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should successfully upsert user session with explicit device info", async () => {
    const mockUser = {
      _id: "60c72b2f9b1d8a25c88c9f12",
      deviceId: "old-id",
      deviceType: "Mobile",
    };

    const mockTokens = {
      refreshToken: "test-refresh-token",
    };

    const deviceData = {
      deviceId: "new-device-id",
      deviceType: "Web",
      deviceToken: "new-push-token",
    };

    const mockReq = {
      ip: "10.0.0.5",
    } as unknown as Request;

    await saveUserSession(mockUser, mockTokens, deviceData, mockReq);

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { userId: "60c72b2f9b1d8a25c88c9f12", deviceId: "new-device-id" },
      expect.objectContaining({
        $set: expect.objectContaining({
          refreshToken: "test-refresh-token",
          deviceType: "Web",
          deviceName: "Web",
          deviceToken: "new-push-token",
          ipAddress: "10.0.0.5",
          lastActiveAt: expect.any(Date),
          expiresAt: expect.any(Date),
        }),
      }),
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  /* =========================================================================
   * EDGE & FALLBACK TEST CASES
   * ========================================================================= */
  it("[Edge] should generate fallback default deviceId and deviceType if missing", async () => {
    const mockUser = {
      _id: "60c72b2f9b1d8a25c88c9f12",
      loginType: "Mobile",
    };

    const mockTokens = {
      refreshToken: "test-refresh-token-2",
    };

    const mockReq = {
      ip: "127.0.0.1",
    } as unknown as Request;

    await saveUserSession(mockUser, mockTokens, {}, mockReq);

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        userId: "60c72b2f9b1d8a25c88c9f12",
        // Should extract last 6 characters of user._id -> 8c9f12
        deviceId: "DEV-8c9f12",
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          refreshToken: "test-refresh-token-2",
          deviceType: "Mobile",
          deviceName: "Mobile",
          deviceToken: null,
          ipAddress: "127.0.0.1",
        }),
      }),
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });
});
