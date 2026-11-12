import { Router } from "express";
import { triggerCronJob } from "./cron.controller";

const router = Router();

/**
 * Cron Job Routes
 * Manually trigger cron jobs for testing/admin purposes
 * Base path: /api/v1/cron
 */

// All routes require authentication
// router.use(authenticate);

/**
 * @route POST /api/v1/cron/trigger
 * @desc Manually trigger a cron job by type
 * @access Private (Authenticated users - restrict to admin in production)
 * @body { type: 'reminder' | 'missed' }
 */
router.post("/trigger", triggerCronJob);

export default router;
