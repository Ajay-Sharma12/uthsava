/**
 * @openapi
 * /api/v1/admin/roles:
 *   get:
 *     summary: List Custom Roles
 *     description: Retrieve all defined sub-admin roles and permission mappings.
 *     tags:
 *       - Role & Permission
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   post:
 *     summary: Create Custom Role
 *     tags:
 *       - Role & Permission
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Content Reviewer
 *               description:
 *                 type: string
 *                 example: Can review and approve content submissions.
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     module:
 *                       type: string
 *                       example: contents
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["view", "approve"]
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/roles/modules:
 *   get:
 *     summary: List Available Permission Modules
 *     description: Get list of system modules and allowed actions for building permission matrices.
 *     tags:
 *       - Role & Permission
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/roles/{roleId}:
 *   get:
 *     summary: Get Role By ID
 *     tags:
 *       - Role & Permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Role Permissions
 *     tags:
 *       - Role & Permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
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
 *                 example: Senior Moderator
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete Role
 *     tags:
 *       - Role & Permission
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
