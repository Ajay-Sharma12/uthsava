/**
 * @openapi
 * /api/v1/admin/email-templates:
 *   get:
 *     summary: List Email Templates (Paginated)
 *     tags:
 *       - Email Templates
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *   post:
 *     summary: Create New System Email Template
 *     tags:
 *       - Email Templates
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateCode
 *               - title
 *               - subject
 *               - body
 *             properties:
 *               templateCode:
 *                 type: string
 *                 example: PRODUCER_WELCOME
 *               title:
 *                 type: string
 *                 example: Producer Welcome Email
 *               subject:
 *                 type: string
 *                 example: Welcome to Uthsava Producer Portal!
 *               body:
 *                 type: string
 *                 example: "<h1>Welcome</h1><p>Dear {{producerName}},</p>"
 *               keywordList:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["producerName", "loginUrl"]
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/email-templates/{templateId}:
 *   get:
 *     summary: Get Email Template Details
 *     tags:
 *       - Email Templates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Email Template
 *     tags:
 *       - Email Templates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Producer Welcome Email
 *               subject:
 *                 type: string
 *                 example: Welcome to the Producer Portal!
 *               body:
 *                 type: string
 *                 example: "<p>Updated body...</p>"
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/email-templates/{templateId}/status:
 *   patch:
 *     summary: Toggle Email Template Status
 *     tags:
 *       - Email Templates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
