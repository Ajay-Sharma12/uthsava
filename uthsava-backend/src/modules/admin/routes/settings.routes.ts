import { Router } from "express";
import {
  getSettings,
  updateSettings,
  updateFreePreview,
  getRevenueBrackets,
  addRevenueBracket,
  updateRevenueBracket,
  deleteRevenueBracket,
  updatePayoutSettings,
} from "../controllers/settings.controller";
import {
  updateSettingsSchema,
  addRevenueBracketSchema,
  updateRevenueBracketSchema,
  bracketIdParamSchema,
} from "../validators/settings.validator";
import {
  validateBody,
  validateParams,
} from "../../../core/middleware/validate.middleware";
import { authorize } from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";

const router = Router();

/**
 * Settings Routes
 * Base path: /api/v1/admin/settings
 *
 * Authentication + base authorization ([ADMIN, ADMIN_SUB_USER]) are applied
 * by the parent admin router via requireSubAdminPermission('settings').
 * Write operations are restricted to ADMIN only.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ GET    /                              Full settings (all sections)       │
 * │ PUT    /                              Update any settings fields         │
 * │                                                                         │
 * │ PUT    /free-preview                  Free Preview toggle + duration     │
 * │                                                                         │
 * │ GET    /revenue-brackets              List all revenue brackets          │
 * │ POST   /revenue-brackets              Add a bracket                      │
 * │ PUT    /revenue-brackets/:bracketId   Edit a bracket                     │
 * │ DELETE /revenue-brackets/:bracketId   Delete a bracket                   │
 * │                                                                         │
 * │ PUT    /payout                        Payout frequency (days)            │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ─── Read (ADMIN + ADMIN_SUB_USER) ────────────────────────────────────────────
router.get("/", getSettings);
router.get("/revenue-brackets", getRevenueBrackets);

// ─── Write (ADMIN only) ───────────────────────────────────────────────────────
router.put(
  "/",
  authorize([Role.ADMIN]),
  validateBody(updateSettingsSchema),
  updateSettings,
);

router.put(
  "/free-preview",
  authorize([Role.ADMIN]),
  validateBody(
    // Reuse the relevant slice of updateSettingsSchema
    updateSettingsSchema
      .fork(["freePreviewEnabled", "freePreviewDurationMinutes"], (s) =>
        s.optional(),
      )
      .unknown(false),
  ),
  updateFreePreview,
);

router.post(
  "/revenue-brackets",
  authorize([Role.ADMIN]),
  validateBody(addRevenueBracketSchema),
  addRevenueBracket,
);

router.put(
  "/revenue-brackets/edit",
  authorize([Role.ADMIN]),
  updateRevenueBracket,
);

router.post(
  "/revenue-brackets/delete",
  authorize([Role.ADMIN]),
  deleteRevenueBracket,
);

router.put(
  "/payout",
  authorize([Role.ADMIN]),
  validateBody(
    updateSettingsSchema
      .fork(["payoutFrequencyDays"], (s) => s.required())
      .unknown(false),
  ),
  updatePayoutSettings,
);

export default router;
