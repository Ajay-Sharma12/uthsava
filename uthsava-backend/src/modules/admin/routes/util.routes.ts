import { Router } from "express";
import { getPresignedUrl, deleteFile } from "../../util/controllers/util.controller";
import {
  authenticate,
  authorize,
} from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";

const router = Router();

/**
 * Admin Utilities Routes (Protected)
 * Base path: /api/v1/admin/utils
 */
router.use(authenticate, authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]));

// Upload & S3 operations
router.post("/presigned-url", getPresignedUrl);
router.post("/util/presigned-url", getPresignedUrl);
router.post("/delete-file", deleteFile);
router.post("/util/delete-file", deleteFile);

export default router;
