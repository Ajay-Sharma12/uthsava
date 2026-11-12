import { Request } from "express";

export const updateUserLoginInfo = async (
  user: any,
  req: Request,
  deviceData: {
    deviceId?: string;
    deviceType?: string;
    deviceToken?: string;
  }
) => {
  const resolvedDeviceId = deviceData.deviceId || user.deviceId || `DEV-${user._id?.toString()?.slice(-6) || "9999"}`;
  const resolvedDeviceType = deviceData.deviceType || user.deviceType || (user.loginType === "Mobile" ? "Mobile" : "Web");
  const resolvedDeviceToken = deviceData.deviceToken || user.deviceToken || null;
  const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || "unknown";
  const userAgent = (req.headers["user-agent"] as string) || resolvedDeviceType;

  Object.assign(user, {
    deviceId: resolvedDeviceId,
    deviceType: resolvedDeviceType,
    deviceToken: resolvedDeviceToken,
    lastLoginAt: new Date(),
    lastLoginIp: ipAddress,
    lastLoginDevice: resolvedDeviceType || userAgent,
  });

  await user.save();
};

export const buildUserResponse = (user: any, tokens: any, isNewUser = 0) => ({
  isNewUser,
  expiresIn: "60d",
  token: tokens.accessToken,
  email: user.email,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  fullName: user.fullName || "",
  mobile: user.mobile || "",
  countryCode: user.countryCode || 0,
  profileImage: user.profileImage || "",
  role: user.role,
  status: user.status,
  userId: user.userId,
  _id: user._id,
  age: user.age || null,
  gender: user.gender || null,
  deviceId: user.deviceId || null,
  deviceType: user.deviceType || null,
  deviceToken: user.deviceToken || null,
  notificationEnabled: user.notificationEnabled,
});
