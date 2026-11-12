/**
 * @openapi
 * /api/v1/admin/contents/approvals/pending:
 *   get:
 *     summary: List Pending Content Approvals
 *     description: Retrieve all pending content submissions awaiting admin review and approval.
 *     tags:
 *       - Content Approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: producerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'

 * /api/v1/admin/contents/approvals/summary:
 *   get:
 *     summary: Get Content Approval Summary
 *     description: Retrieve quick count summaries of pending, approved, and rejected content.
 *     tags:
 *       - Content Approval
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/approvals/stats:
 *   get:
 *     summary: Get Approval Statistics
 *     description: Retrieve detailed date-range statistics for content approvals.
 *     tags:
 *       - Content Approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/approval-details:
 *   get:
 *     summary: Get Content Details for Approval Review
 *     description: Retrieve complete media and metadata of a content submission for admin review.
 *     tags:
 *       - Content Approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/approve:
 *   patch:
 *     summary: Approve Pending Content Item
 *     description: Admin approves a pending content item, changing status to APPROVED / ACTIVE.
 *     tags:
 *       - Content Approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalNotes:
 *                 type: string
 *                 example: Meets all quality standards and age ratings.
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/reject:
 *   patch:
 *     summary: Reject Pending Content Item
 *     description: Admin rejects a content submission with mandatory feedback/reasoning for producer.
 *     tags:
 *       - Content Approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 example: Audio quality is substandard; please re-upload clear audio.
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/approval-history:
 *   get:
 *     summary: Get Content Approval History
 *     description: Audit trail of all previous review actions, notes, and rejection reasons for a content item.
 *     tags:
 *       - Content Approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/submit-for-review:
 *   patch:
 *     summary: Submit Content for Approval Review (Producer)
 *     description: Producer submits a draft or rejected content item for admin review.
 *     tags:
 *       - Content Approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
