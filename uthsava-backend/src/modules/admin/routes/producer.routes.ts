import { Router } from "express";
import {
  listProducers,
  getProducerById,
  getProducerDetail,
  createProducer,
  updateProducer,
  updateProducerStatus,
  deleteProducer,
} from "../controllers/producer.controller";
import {
  producerIdParamSchema,
  createProducerSchema,
  updateProducerSchema,
  updateProducerStatusSchema,
  listProducersQuerySchema,
} from "../validators/producer.validator";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import { authorize } from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";

const router = Router();

/**
 * Producer Management Routes
 * Base path: /api/v1/admin/producers
 *
 * Authentication + base authorization ([ADMIN, ADMIN_SUB_USER]) already applied
 * by the parent admin router.
 * Write operations are restricted to the main ADMIN role only.
 */

// ─── Write (ADMIN + ADMIN_SUB_USER with producers permission) ─────────────
router.get("/", validateQuery(listProducersQuerySchema), listProducers);
router.get(
  "/:producerId/detail",
  validateParams(producerIdParamSchema),
  getProducerDetail,
);
router.get(
  "/:producerId",
  validateParams(producerIdParamSchema),
  getProducerById,
);

// ─── Write (ADMIN + ADMIN_SUB_USER with producers permission) ───────────────────────────────────────
router.post(
  "/",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateBody(createProducerSchema),
  createProducer,
);
router.put(
  "/:producerId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(producerIdParamSchema),
  validateBody(updateProducerSchema),
  updateProducer,
);
router.patch(
  "/:producerId/status",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(producerIdParamSchema),
  validateBody(updateProducerStatusSchema),
  updateProducerStatus,
);
router.delete(
  "/:producerId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(producerIdParamSchema),
  deleteProducer,
);

export default router;
