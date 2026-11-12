/**
 * @openapi
 * /api/v1/admin/award-badges:
 *   get:
 *     summary: List Award & Badges (Paginated)
 *     tags:
 *       - Awards & Badges
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [AWARD, BADGE]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *   post:
 *     summary: Create Award or Badge
 *     tags:
 *       - Awards & Badges
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: Golden Palm Award 2026
 *               type:
 *                 type: string
 *                 enum: [AWARD, BADGE]
 *                 example: AWARD
 *               contentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["652a3b4c5d6e7f8a9b0c1d23"]
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/award-badges/{awardBadgeId}:
 *   get:
 *     summary: Get Award/Badge By ID
 *     tags:
 *       - Awards & Badges
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: awardBadgeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Award/Badge Details
 *     tags:
 *       - Awards & Badges
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: awardBadgeId
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
 *               name:
 *                 type: string
 *                 example: Updated Award Title
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/award-badges/{awardBadgeId}/status:
 *   patch:
 *     summary: Toggle Award/Badge Active Status
 *     tags:
 *       - Awards & Badges
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: awardBadgeId
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
