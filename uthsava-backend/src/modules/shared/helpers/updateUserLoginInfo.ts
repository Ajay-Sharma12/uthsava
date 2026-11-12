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
  Object.assign(user, {
    ...deviceData,
    lastLoginAt: new Date(),
    lastLoginIp: req.ip,
    lastLoginDevice: req.headers["user-agent"] || "",
  });

  await user.save();
};
