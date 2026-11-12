/**
 * @openapi
 * /api/v1/admin/sub-admins:
 *   get:
 *     summary: List Sub-Admins (Paginated)
 *     tags:
 *       - Sub-Admins
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
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *   post:
 *     summary: Create Sub-Admin Account
 *     tags:
 *       - Sub-Admins
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Mark
 *               lastName:
 *                 type: string
 *                 example: Spencer
 *               email:
 *                 type: string
 *                 format: email
 *                 example: mark.sub@uthsava.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SubAdmin@12345
 *               roleId:
 *                 type: string
 *                 example: 65bc1d2e3f4a5b6c7d8e9f0a
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/sub-admins/{subAdminId}:
 *   get:
 *     summary: Get Sub-Admin By ID
 *     tags:
 *       - Sub-Admins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subAdminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Sub-Admin Profile & Role
 *     tags:
 *       - Sub-Admins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subAdminId
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
 *               firstName:
 *                 type: string
 *                 example: Mark
 *               lastName:
 *                 type: string
 *                 example: Spencer
 *               roleId:
 *                 type: string
 *                 example: 65bc1d2e3f4a5b6c7d8e9f0a
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete Sub-Admin Account
 *     tags:
 *       - Sub-Admins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subAdminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/sub-admins/{subAdminId}/activities:
 *   get:
 *     summary: Get Sub-Admin Activity Log
 *     tags:
 *       - Sub-Admins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subAdminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'

 * /api/v1/admin/sub-admins/{subAdminId}/status:
 *   patch:
 *     summary: Toggle Sub-Admin Active Status
 *     tags:
 *       - Sub-Admins
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subAdminId
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
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
