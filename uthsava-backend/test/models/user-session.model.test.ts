/// <reference types="jest" />
import { UserSession, DeviceType } from "../../src/models/user-session.model";
import mongoose from "mongoose";

describe("UserSession Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const session = new UserSession({
      userId: validUserId,
      refreshToken: "some-valid-refresh-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const error = session.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Positive] should validate with all optional fields", () => {
    const session = new UserSession({
      userId: validUserId,
      refreshToken: "valid-token-string",
      deviceId: "device-id-001",
      deviceType: DeviceType.ANDROID,
      deviceName: "Google Pixel 7",
      deviceToken: "fcm-token-abc",
      ipAddress: "192.168.1.100",
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const error = session.validateSync();
    expect(error).toBeUndefined();
    expect(session.deviceType).toBe(DeviceType.ANDROID);
    expect(session.deviceId).toBe("device-id-001");
  });

  it("[Positive] should validate with IOS device type", () => {
    const session = new UserSession({
      userId: validUserId,
      refreshToken: "valid-token",
      deviceType: DeviceType.IOS,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const error = session.validateSync();
    expect(error).toBeUndefined();
    expect(session.deviceType).toBe(DeviceType.IOS);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const session = new UserSession({
      refreshToken: "valid-token",
      expiresAt: new Date(Date.now() + 3600000),
    } as any);

    const error = session.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail validation when refreshToken is missing", () => {
    const session = new UserSession({
      userId: validUserId,
      expiresAt: new Date(Date.now() + 3600000),
    } as any);

    const error = session.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["refreshToken"]).toBeDefined();
  });

  it("[Negative] should fail validation when expiresAt is missing", () => {
    const session = new UserSession({
      userId: validUserId,
      refreshToken: "valid-token",
    } as any);

    const error = session.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["expiresAt"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail with invalid deviceType enum value", () => {
    const session = new UserSession({
      userId: validUserId,
      refreshToken: "valid-token",
      expiresAt: new Date(Date.now() + 3600000),
      deviceType: "SMART_TV" as any,
    });

    const error = session.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["deviceType"]).toBeDefined();
  });

  it("[Edge] should validate all valid DeviceType values", () => {
    const deviceTypes = [
      DeviceType.ANDROID,
      DeviceType.IOS,
      DeviceType.WEB,
      DeviceType.ANDROID_TV,
      DeviceType.APPLE_TV,
      DeviceType.FIRE_TV,
    ];

    deviceTypes.forEach((deviceType) => {
      const session = new UserSession({
        userId: validUserId,
        refreshToken: "valid-token",
        expiresAt: new Date(Date.now() + 3600000),
        deviceType,
      });
      const error = session.validateSync();
      expect(error).toBeUndefined();
    });
  });

  it("[Edge] should accept expiresAt in the past (no future-date constraint on schema)", () => {
    const session = new UserSession({
      userId: validUserId,
      refreshToken: "valid-token",
      expiresAt: new Date("2020-01-01"),
    });

    const error = session.validateSync();
    expect(error).toBeUndefined();
  });
});
