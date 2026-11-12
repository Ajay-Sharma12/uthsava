/**
 * @openapi
 * /api/v1/admin/producers:
 *   get:
 *     summary: List Producers (Paginated)
 *     description: Retrieve paginated list of producers with search, status filter, and pagination.
 *     tags:
 *       - Producers
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
 *         description: Search by company name, contact person, or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, PENDING, REJECTED]
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create Producer Account
 *     description: Register a new producer company profile.
 *     tags:
 *       - Producers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - contactPersonName
 *               - email
 *               - password
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: Apex Studios
 *               contactPersonName:
 *                 type: string
 *                 example: John Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: producer@apexstudios.com
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Producer@12345
 *               revenueSharePercentage:
 *                 type: number
 *                 example: 70
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Producer email already exists.
 *         $ref: '#/components/schemas/ErrorResponse'

 * /api/v1/admin/producers/{producerId}:
 *   get:
 *     summary: Get Producer By ID
 *     description: Get basic producer details.
 *     tags:
 *       - Producers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: producerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update Producer Profile
 *     description: Update producer company details and revenue sharing settings.
 *     tags:
 *       - Producers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: producerId
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
 *               companyName:
 *                 type: string
 *                 example: Apex Studios Ltd.
 *               contactPersonName:
 *                 type: string
 *                 example: John Smith
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *               revenueSharePercentage:
 *                 type: number
 *                 example: 75
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete Producer Account
 *     description: Soft delete or remove a producer account.
 *     tags:
 *       - Producers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: producerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'

 * /api/v1/admin/producers/{producerId}/detail:
 *   get:
 *     summary: Get Producer Full Details
 *     description: Retrieve comprehensive producer details including content statistics and revenue summary.
 *     tags:
 *       - Producers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: producerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'

 * /api/v1/admin/producers/{producerId}/status:
 *   patch:
 *     summary: Update Producer Status
 *     description: Approve, reject, activate, or deactivate a producer account.
 *     tags:
 *       - Producers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: producerId
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
 *                 enum: [ACTIVE, INACTIVE, PENDING, REJECTED]
 *                 example: ACTIVE
 *               rejectionReason:
 *                 type: string
 *                 example: Incomplete documentation
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
