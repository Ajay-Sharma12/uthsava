import { Router } from "express";
import {
  adminLoginSchema,
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/auth.validator";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
} from "../../../core/middleware/rateLimiter.middleware";
import { validateBody } from "../../../core/middleware/validate.middleware";
import {
  login,
  refreshToken,
  getProfile,
  logout,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  updateProfile,
  changePassword,
} from "../controllers/auth.controller";
import {
  authenticate,
  authorize,
  adminInactivityTimeout
} from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";

const router = Router();

// Public routes
router.post("/login", loginRateLimiter, validateBody(adminLoginSchema), login);
router.post("/refresh-token", refreshToken);
router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateBody(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/verify-reset-token",
  validateBody(verifyResetTokenSchema),
  verifyResetToken,
);
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPassword,
);

/**
 * Admin Authentication Routes (Protected)
 * Base path: /api/v1/admin
 * Allows: Admin, Sub-Admin, and Producer roles
 */
router.use(
  authenticate,
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  adminInactivityTimeout
);

// Profile
router.get("/profile", getProfile);
router.put("/profile", validateBody(updateProfileSchema), updateProfile);
router.post(
  "/change-password",
  validateBody(changePasswordSchema),
  changePassword,
);
router.post("/logout", logout);
export default router;
