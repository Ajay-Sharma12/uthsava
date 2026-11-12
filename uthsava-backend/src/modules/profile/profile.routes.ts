import { Router } from "express";
import { authenticate } from "../../core/middleware/auth.middleware";
import { validateBody } from "../../core/middleware/validate.middleware";
import {
  getProfile,
  updateProfile,
  updateProfileImage,
  changePassword,
  updateNotificationSettings,
  createSubProfile,
  getSubProfiles,
} from "./controllers/profile.controller";
import {
  updateProfileSchema,
  updateProfileImageSchema,
  changePasswordSchema,
  updateNotificationSettingsSchema,
} from "./validators/profile.validator";
import { createSubProfileSchema } from "../avatar/validators/avatar.validator";

const router = Router();

/**
 * Profile Routes
 * Base path: /api/v1/profile
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v1/profile
 * Get current user's profile information
 */
router.get("/", getProfile);

/**
 * PUT /api/v1/profile
 * Update current user's profile
 */
router.put("/", validateBody(updateProfileSchema), updateProfile);

/**
 * PUT /api/v1/profile/image
 * Update current user's profile image
 */
router.put(
  "/image",
  validateBody(updateProfileImageSchema),
  updateProfileImage,
);

/**
 * PUT /api/v1/profile/change-password
 * Change current user's password
 */
router.put(
  "/change-password",
  validateBody(changePasswordSchema),
  changePassword,
);

/**
 * PUT /api/v1/profile/notification-settings
 * Update current user's notification settings
 */
router.put(
  "/notification-settings",
  validateBody(updateNotificationSettingsSchema),
  updateNotificationSettings,
);

/**
 * POST /api/v1/profile/sub-profiles
 * Create a new sub-profile account ("Create Profile" / "Add Account")
 * Body: { name, isKids, avatar }
 */
router.post(
  "/sub-profiles",
  validateBody(createSubProfileSchema),
  createSubProfile,
);
router.post(
  "/create-account",
  validateBody(createSubProfileSchema),
  createSubProfile,
);

/**
 * GET /api/v1/profile/sub-profiles
 * Get all sub-profile accounts for current user ("Who's watching?" screen)
 */
router.get("/sub-profiles", getSubProfiles);
router.get("/accounts", getSubProfiles);

export default router;

