import { Router } from "express";
import {
  listFaqs,
  createFaq,
  getFaqById,
  updateFaq,
  updateFaqStatus,
  deleteFaq,
} from "../controllers/faq.controller";
import { validateBody } from "../../../core/middleware/validate.middleware";
import {
  authenticate,
  authorize,
} from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";
import {
  createFaqSchema,
  updateFaqSchema,
  updateFaqStatusSchema,
} from "../validators/faq.validator";

const router = Router();
/**
 * Protected Admin Routes - require authentication
 * Base path: /api/v1/admin
 */

router.use(authenticate, authorize([Role.ADMIN, Role.ADMIN_SUB_USER]));

// FAQ Management (Admin)
router.get("/", listFaqs);
router.post("/", validateBody(createFaqSchema), createFaq);
router.get("/:faqId", getFaqById);
router.put("/:faqId", validateBody(updateFaqSchema), updateFaq);
router.patch(
  "/:faqId/status",
  validateBody(updateFaqStatusSchema),
  updateFaqStatus,
);
router.delete("/:faqId", deleteFaq);

export default router;
