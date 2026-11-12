/**
 * @openapi
 * /api/v1/admin/categories:
 *   get:
 *     summary: List Content Categories & Genres
 *     description: Retrieve list of categories or genres with search, status, and type filters.
 *     tags:
 *       - Categories & Genres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [category, genre]
 *         description: Distinguish between categories and genres
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
 *         $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create Category or Genre
 *     tags:
 *       - Categories & Genres
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
 *                 example: Action & Adventure
 *               type:
 *                 type: string
 *                 enum: [category, genre]
 *                 example: category
 *               displayOrder:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/categories/{categoryId}:
 *   get:
 *     summary: Get Category or Genre By ID
 *     tags:
 *       - Categories & Genres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Category or Genre
 *     tags:
 *       - Categories & Genres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
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
 *                 example: High Octane Action
 *               displayOrder:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete Category or Genre
 *     tags:
 *       - Categories & Genres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/categories/{categoryId}/status:
 *   patch:
 *     summary: Toggle Category Status
 *     tags:
 *       - Categories & Genres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
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

 * /api/v1/admin/categories/{categoryId}/display-order:
 *   patch:
 *     summary: Update Display Order Sequence
 *     tags:
 *       - Categories & Genres
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
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
 *               - displayOrder
 *             properties:
 *               displayOrder:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
