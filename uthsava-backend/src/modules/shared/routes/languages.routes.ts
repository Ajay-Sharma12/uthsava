import { Router } from "express";
import { getLanguages } from "../controllers/languages.controller";

const router = Router();

/**
 * GET /api/v1/languages
 * Public endpoint to list supported languages
 */
router.get("/", getLanguages);

export default router;
