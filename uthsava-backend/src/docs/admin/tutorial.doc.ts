/**
 * @openapi
 * /api/v1/admin/tutorial-slides:
 *   get:
 *     summary: List Tutorial Slides (Paginated)
 *     tags:
 *       - Tutorials
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
 *         name: mediaType
 *         schema:
 *           type: string
 *           enum: [IMAGE, VIDEO]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *   post:
 *     summary: Create Tutorial Slide
 *     tags:
 *       - Tutorials
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - mediaType
 *             properties:
 *               title:
 *                 type: string
 *                 example: Welcome to Uthsava App
 *               description:
 *                 type: string
 *                 example: Explore regional cinema and exclusive originals.
 *               mediaType:
 *                 type: string
 *                 enum: [IMAGE, VIDEO]
 *                 example: IMAGE
 *               image:
 *                 type: string
 *                 example: https://cdn.example.com/slide1.png
 *               sequence:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/tutorial-slides/{slideId}:
 *   get:
 *     summary: Get Tutorial Slide By ID
 *     tags:
 *       - Tutorials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Tutorial Slide
 *     tags:
 *       - Tutorials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
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
 *                 example: Updated Slide Title
 *               sequence:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete Tutorial Slide
 *     tags:
 *       - Tutorials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/tutorial-slides/{slideId}/status:
 *   patch:
 *     summary: Toggle Tutorial Slide Status
 *     tags:
 *       - Tutorials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slideId
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
