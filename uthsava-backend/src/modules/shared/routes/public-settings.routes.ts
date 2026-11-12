import { Router } from "express";
import { getSettings } from "../../admin/controllers/settings.controller";

const router = Router();

/**
 * @route   GET /api/v1/settings
 * @desc    Get public application settings
 * @access  Public (No authentication required)
 */
router.get("/", getSettings);

export default router;
