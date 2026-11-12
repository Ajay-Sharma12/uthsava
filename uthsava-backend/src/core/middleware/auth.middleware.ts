import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { JwtPayload, Role } from "../../common/types/auth.types";
import { User, UserStatus } from "../../models";

/**
 * Augment Express.Request so `req.user` is typed project-wide.
 * (Also declared in `common/types/express.d.ts`; this duplicate ensures tools that
 * skip loose .d.ts merges still compile — interfaces merge harmlessly.)
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    if (!payload.sub && payload._id) {
      payload.sub = payload._id;
    }
    if (!payload._id && payload.sub) {
      payload._id = payload.sub;
    }
    req.user = payload;

    const userId = payload._id || payload.sub;
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        code: "SESSION_EXPIRED",
      });
    }

    // Check if user has an active session (refreshToken exists)
    if (!user.refreshToken) {
      return res.status(401).json({
        message: "Session expired",
        code: "SESSION_EXPIRED",
      });
    }

    // Check if user account is active
    if (user.status !== UserStatus.ACTIVE) {
      await User.findByIdAndUpdate(userId, {
        refreshToken: null,
        deviceToken: null,
        deviceType: null,
        lastLoginAt: new Date(),
      });
      return res.status(401).json({
        message: "Account deactivated",
        code: "ACCOUNT_INACTIVE",
      });
    }

    // Check if permissions require admin verification (applies to sub-admin or producer)
    if (user.role !== Role.ADMIN && (user as any).isActionRequired) {
      await User.findByIdAndUpdate(userId, {
        refreshToken: null,
        deviceToken: null,
        deviceType: null,
      });
      return res.status(401).json({
        message: "Your permissions have been updated by an administrator. Please sign in again.",
        code: "SESSION_INVALIDATED",
      });
    }

    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const authorize =
  (roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const isRoleAllowed = roles.includes(req.user.role);

    if (!isRoleAllowed) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

export const adminInactivityTimeout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id || req.user?.sub;
    if (!userId) return next();

    const user = await User.findById(userId);
    if (!user) return next();

    const inactivityTimeout =
      Number(process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES) || 30; // default 30 mins

    if (user.lastActiveAt) {
      const inactiveMinutes =
        (Date.now() - user.lastActiveAt.getTime()) / 60000;
      if (inactiveMinutes > inactivityTimeout) {
        // Terminate session
        await User.findByIdAndUpdate(userId, {
          refreshToken: null,
          deviceToken: null,
          deviceType: null,
          deviceId: null,
        });

        return res.status(401).json({
          message: "Session expired due to inactivity",
          code: "SESSION_TIMEOUT",
        });
      }
    }

    // Update lastActiveAt (debounce by 1 minute to avoid excessive DB writes)
    if (
      !user.lastActiveAt ||
      Date.now() - user.lastActiveAt.getTime() > 60000
    ) {
      await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });
    }

    next();
  } catch (error) {
    console.error("Admin inactivity check failed:", error);
    next();
  }
};
