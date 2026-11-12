import { Router } from "express";
import { getPresignedUrl, sendEmail, deleteFile } from "../controllers/util.controller";
import { authenticate } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * Protected Routes (Authentication Required)
 */
router.use(authenticate);

/**
 * User Routes (All authenticated users)
 */
router.post("/email", sendEmail);

/**
 * Upload Routes (All authenticated users)
 */
router.post("/presigned-url", getPresignedUrl);
router.post("/delete-file", deleteFile);

export default router;
