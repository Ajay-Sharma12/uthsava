import { Router } from "express";
import { listPublicFaqs } from "../admin/controllers/faq.controller";

const router = Router();

/**
 * Public FAQ Routes
 * Base path: /api/v1/faqs
 *
 * Returns all active FAQs sorted by order (ascending)
 *
 * Query parameters:
 * - lang: Language code (en, ar) - optional
 *
 * Example: /api/v1/faqs?lang=en
 */
router.get("/", listPublicFaqs);

export default router;
