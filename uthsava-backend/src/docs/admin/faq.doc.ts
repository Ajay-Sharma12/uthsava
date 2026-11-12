/**
 * @openapi
 * /api/v1/admin/faqs:
 *   get:
 *     summary: List All FAQs
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   post:
 *     summary: Create FAQ
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *                 example: How do I upgrade my subscription plan?
 *               answer:
 *                 type: string
 *                 example: Navigate to Profile Settings > Subscription and click Upgrade.
 *               category:
 *                 type: string
 *                 example: Billing
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/faqs/{faqId}:
 *   get:
 *     summary: Get FAQ By ID
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update FAQ
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faqId
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
 *               question:
 *                 type: string
 *                 example: Updated Question?
 *               answer:
 *                 type: string
 *                 example: Updated Answer.
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete FAQ
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faqId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/faqs/{faqId}/status:
 *   patch:
 *     summary: Toggle FAQ Status
 *     tags:
 *       - FAQs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faqId
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
