import { Router } from "express";
import {
  listPendingApprovals,
  getContentForApproval,
  approveContent,
  rejectContent,
  holdContent,
  requestReEdit,
  revokeReEdit,
  submitForReview,
    // getContentApprovalHistory,
  getApprovalSummary,
  getApprovalStats,
} from "../controllers/content-approval.controller";
import { authorize } from "../../../core/middleware/auth.middleware";
import { requireSubAdminPermission } from "../../../core/middleware/subadmin-permission.middleware";
import { Role } from "../../../common/types/auth.types";
import {
  validateParams,
  validateBody,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import { contentIdParamSchema } from "../validators/content.validator";
import {
  approveContentSchema,
  rejectContentSchema,
  holdContentSchema,
  requestReEditSchema,
  listPendingApprovalsQuerySchema,
  listApprovalHistoryQuerySchema,
  getApprovalSummaryQuerySchema,
} from "../validators/content-approval.validator";

const router = Router();

/**
 * Content Approval Routes
 * Base path: /api/v1/admin/contents
 *
 * Permission Levels:
 * - ADMIN: Full access (view, approve, reject)
 * - ADMIN_SUB_USER with content_approval.view: View-only access
 * - ADMIN_SUB_USER with content_approval.approve: Approve/reject access
 */

// ─── List Pending Approvals ───────────────────────────────────────────────

/**
 * GET /approvals/pending
 * List all pending content with filters and pagination
 * Requires: view permission
 */
router.get(
  "/approvals/pending",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval"),
  validateQuery(listPendingApprovalsQuerySchema),
  listPendingApprovals,
);

// ─── Approval Summary & Stats ─────────────────────────────────────────────

/**
 * GET /approvals/summary
 * Get approval summary statistics
 * Requires: view permission
 */
router.get(
  "/approvals/summary",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval"),
  validateQuery(getApprovalSummaryQuerySchema),
  getApprovalSummary,
);

/**
 * GET /approvals/stats
 * Get detailed approval statistics for date range
 * Requires: view permission
 */
router.get(
  "/approvals/stats",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval"),
  validateQuery(getApprovalSummaryQuerySchema),
  getApprovalStats,
);

// ─── Content-Specific Approval Operations ──────────────────────────────────

/**
 * GET /:contentId/approval-details
 * Get content details for approval review
 * Requires: view permission
 */
router.get(
  "/:contentId/approval-details",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval"),
  validateParams(contentIdParamSchema),
  getContentForApproval,
);

/**
 * PATCH /:contentId/approve
 * Approve a pending content item
 * Requires: approve permission (for approval actions)
 * Body: { approvalNotes?: string }
 */
router.patch(
  "/:contentId/approve",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval", "approve"),
  validateParams(contentIdParamSchema),
  validateBody(approveContentSchema),
  approveContent,
);

/**
 * PATCH /:contentId/reject
 * Reject a pending content item
 * Requires: approve permission (for approval actions)
 * Body: { rejectionReason: string }
 */
router.patch(
  "/:contentId/reject",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval", "approve"),
  validateParams(contentIdParamSchema),
  validateBody(rejectContentSchema),
  rejectContent,
);

/**
 * PATCH /:contentId/hold
 * Put content on 24h quality hold
 * Requires: approve permission
 */
router.patch(
  "/:contentId/hold",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval", "approve"),
  validateParams(contentIdParamSchema),
  validateBody(holdContentSchema),
  holdContent,
);

/**
 * PATCH /:contentId/request-reedit
 * Request re-edit from producer
 * Requires: approve permission
 */
router.patch(
  "/:contentId/request-reedit",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval", "approve"),
  validateParams(contentIdParamSchema),
  validateBody(requestReEditSchema),
  requestReEdit,
);

/**
 * PATCH /:contentId/revoke-reedit
 * Revoke re-edit request and restore pending status
 * Requires: approve permission
 */
router.patch(
  "/:contentId/revoke-reedit",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval", "approve"),
  validateParams(contentIdParamSchema),
  revokeReEdit,
);

/**
 * GET /:contentId/approval-history
 * Get approval history for a specific content
 * Requires: view permission
 * Query: page, limit, status, sortOrder
 */
router.get(
  "/:contentId/approval-history",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  requireSubAdminPermission("content_approval"),
  validateParams(contentIdParamSchema),
  validateQuery(listApprovalHistoryQuerySchema),
  // getContentApprovalHistory,
);

/**
 * PATCH /:contentId/submit-for-review
 * Producer submits content for admin review
 * Changes status from DRAFT or REJECTED to PENDING
 */
router.patch(
  "/:contentId/submit-for-review",
  authorize([Role.PRODUCER]),
  validateParams(contentIdParamSchema),
  submitForReview,
);

export default router;
