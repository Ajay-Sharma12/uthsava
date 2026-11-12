/**
 * @openapi
 * /api/v1/admin/settings:
 *   get:
 *     summary: Get Platform Settings
 *     description: Retrieve all global system settings including free preview, payout parameters, and revenue brackets.
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Settings retrieved
 *                 results:
 *                   $ref: '#/components/schemas/Settings'
 *   put:
 *     summary: Update Platform Settings
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               freePreviewEnabled:
 *                 type: boolean
 *                 example: true
 *               freePreviewDurationMinutes:
 *                 type: integer
 *                 example: 5
 *               payoutFrequencyDays:
 *                 type: integer
 *                 example: 30
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/settings/free-preview:
 *   put:
 *     summary: Update Free Preview Settings
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               freePreviewEnabled:
 *                 type: boolean
 *                 example: true
 *               freePreviewDurationMinutes:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/settings/revenue-brackets:
 *   get:
 *     summary: List Revenue Brackets
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   post:
 *     summary: Add Revenue Share Bracket
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - minViews
 *               - producerPercentage
 *             properties:
 *               minViews:
 *                 type: integer
 *                 example: 10000
 *               maxViews:
 *                 type: integer
 *                 example: 50000
 *               producerPercentage:
 *                 type: number
 *                 example: 65
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/settings/revenue-brackets/edit:
 *   put:
 *     summary: Edit Revenue Share Bracket
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bracketId
 *             properties:
 *               bracketId:
 *                 type: string
 *                 example: 65de3f4a5b6c7d8e9f0a1b2c
 *               producerPercentage:
 *                 type: number
 *                 example: 70
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/settings/revenue-brackets/delete:
 *   post:
 *     summary: Delete Revenue Share Bracket
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bracketId
 *             properties:
 *               bracketId:
 *                 type: string
 *                 example: 65de3f4a5b6c7d8e9f0a1b2c
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/settings/payout:
 *   put:
 *     summary: Update Payout Frequency Settings
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payoutFrequencyDays
 *             properties:
 *               payoutFrequencyDays:
 *                 type: integer
 *                 example: 15
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
