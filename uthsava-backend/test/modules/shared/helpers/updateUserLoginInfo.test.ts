import { Request } from "express";
import { updateUserLoginInfo } from "../../../../src/modules/shared/helpers/updateUserLoginInfo";

describe("updateUserLoginInfo Helper Unit Tests", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should successfully assign login details and call user.save()", async () => {
    const mockUser = {
      save: jest.fn().mockResolvedValue(true),
    };

    const mockReq = {
      ip: "192.168.10.1",
      headers: {
        "user-agent": "Safari/537.36",
      },
    } as unknown as Request;

    const deviceData = {
      deviceId: "device-xyz",
      deviceType: "Tablet",
      deviceToken: "token-uvw",
    };

    await updateUserLoginInfo(mockUser, mockReq, deviceData);

    expect(mockUser).toEqual(
      expect.objectContaining({
        deviceId: "device-xyz",
        deviceType: "Tablet",
        deviceToken: "token-uvw",
        lastLoginIp: "192.168.10.1",
        lastLoginDevice: "Safari/537.36",
        lastLoginAt: expect.any(Date),
      })
    );
    expect(mockUser.save).toHaveBeenCalled();
  });

  /* =========================================================================
   * EDGE & FALLBACK TEST CASES
   * ========================================================================= */
  it("[Edge] should fallback to empty user-agent string if request header is missing", async () => {
    const mockUser = {
      save: jest.fn().mockResolvedValue(true),
    };

    const mockReq = {
      ip: "127.0.0.1",
      headers: {},
    } as unknown as Request;

    await updateUserLoginInfo(mockUser, mockReq, {});

    expect(mockUser).toEqual(
      expect.objectContaining({
        lastLoginIp: "127.0.0.1",
        lastLoginDevice: "",
        lastLoginAt: expect.any(Date),
      })
    );
    expect(mockUser.save).toHaveBeenCalled();
  });
});
