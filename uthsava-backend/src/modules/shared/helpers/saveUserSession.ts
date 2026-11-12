import { UserSession } from "../../../models/user-session.model";
import { Request } from "express";

const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

const upsertUserSession = async (
  userId: unknown,
  refreshToken: string,
  deviceId: string,
  deviceType: string,
  deviceToken: string | undefined,
  req: Request,
) => {
  await UserSession.findOneAndUpdate(
    { userId, deviceId },
    {
      $set: {
        refreshToken,
        deviceType,
        deviceName: deviceType,
        deviceToken: deviceToken ?? null,
        ipAddress: req.ip,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

export const saveUserSession = async (
  user: any,
  tokens: any,
  deviceData: {
    deviceId?: string;
    deviceType?: string;
    deviceToken?: string;
  },
  req: Request
) => {
  const deviceId = deviceData.deviceId || user.deviceId || `DEV-${user._id?.toString()?.slice(-6) || "9999"}`;
  const deviceType = deviceData.deviceType || user.deviceType || (user.loginType === "Mobile" ? "Mobile" : "Web");
  const deviceToken = deviceData.deviceToken || user.deviceToken || undefined;

  await upsertUserSession(
    user._id,
    tokens.refreshToken,
    deviceId,
    deviceType,
    deviceToken,
    req
  );
};
