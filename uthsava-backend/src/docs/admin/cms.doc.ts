/**
 * @openapi
 * /api/v1/admin/cms:
 *   get:
 *     summary: List CMS Pages
 *     tags:
 *       - CMS & Static Content
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   post:
 *     summary: Create New CMS Page
 *     tags:
 *       - CMS & Static Content
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
 *               - slug
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: Terms of Service
 *               slug:
 *                 type: string
 *                 example: terms-of-service
 *               content:
 *                 type: string
 *                 example: "<h1>Terms of Service</h1><p>Welcome to Uthsava...</p>"
 *               metaTitle:
 *                 type: string
 *                 example: Terms of Service - Uthsava
 *               metaDescription:
 *                 type: string
 *                 example: Official terms of service document.
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/cms/{pageId}:
 *   get:
 *     summary: Get CMS Page By ID
 *     tags:
 *       - CMS & Static Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update CMS Page
 *     tags:
 *       - CMS & Static Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
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
 *                 example: Terms & Conditions
 *               content:
 *                 type: string
 *                 example: "<p>Updated content...</p>"
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete CMS Page
 *     tags:
 *       - CMS & Static Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/cms/{pageId}/status:
 *   patch:
 *     summary: Toggle CMS Page Status
 *     tags:
 *       - CMS & Static Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
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

 * /api/v1/admin/cms/{pageId}/active-status:
 *   patch:
 *     summary: Alias for Active Status Toggle
 *     tags:
 *       - CMS & Static Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
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

 * /api/v1/admin/cms/{pageId}/publication-status:
 *   patch:
 *     summary: Update CMS Page Publication Status (DRAFT / PUBLISHED)
 *     tags:
 *       - CMS & Static Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
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
 *               - publicationStatus
 *             properties:
 *               publicationStatus:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED]
 *                 example: PUBLISHED
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
