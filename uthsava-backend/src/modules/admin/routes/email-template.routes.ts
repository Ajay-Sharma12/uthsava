import { Router } from "express";
import {
  createEmailTemplate,
  listEmailTemplates,
  getEmailTemplateById,
  updateEmailTemplate,
  updateEmailTemplateStatus,
} from "../controllers/email-template.controller";
import {
  emailTemplateIdParamSchema,
  emailTemplateListFiltersSchema,
  emailTemplateStatusSchema,
  createEmailTemplateSchema,
} from "../validators/email-template.validator";
import { updateEmailTemplateSchema } from "../validators/update-email-template.validator";
import {
  validateParams,
  validateQuery,
  validateBody,
} from "../../../core/middleware/validate.middleware";

const router = Router();

/**
 * Email Template Management Routes
 * Base path: /api/v1/admin/email-templates
 */

// Create new template
router.post(
  "/",
  validateBody(createEmailTemplateSchema),
  createEmailTemplate,
);

// List with search/filter/pagination
router.get(
  "/",
  validateQuery(emailTemplateListFiltersSchema),
  listEmailTemplates,
);

// Get single template
router.get(
  "/:templateId",
  validateParams(emailTemplateIdParamSchema),
  getEmailTemplateById,
);

// Edit template fields (title, subject, description, signature, keywordList, status)
router.put(
  "/:templateId",
  validateParams(emailTemplateIdParamSchema),
  validateBody(updateEmailTemplateSchema),
  updateEmailTemplate,
);

// Toggle status (active / inactive)
router.patch(
  "/:templateId/status",
  validateParams(emailTemplateIdParamSchema),
  validateBody(emailTemplateStatusSchema),
  updateEmailTemplateStatus,
);

export default router;
