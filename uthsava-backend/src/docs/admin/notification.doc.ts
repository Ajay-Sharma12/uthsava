/**
 * @openapi
 * /api/v1/admin/notifications:
 *   get:
 *     summary: List Sent Admin Notifications (Paginated)
 *     tags:
 *       - Notifications
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
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *   post:
 *     summary: Broadcast or Direct Send Notification
 *     tags:
 *       - Notifications
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
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 example: Weekend Binge Specials!
 *               message:
 *                 type: string
 *                 example: Stream top blockbuster movies this weekend with 20% cashback.
 *               targetType:
 *                 type: string
 *                 enum: [ALL, SPECIFIC_USERS, PRODUCERS]
 *                 example: ALL
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["64f1a2b3c4d5e6f7a8b9c0d1"]
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/notifications/my-notifications:
 *   get:
 *     summary: In-App User Inbox Notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/notifications/unread-count:
 *   get:
 *     summary: Unread Notification Badge Count
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 unreadCount:
 *                   type: integer
 *                   example: 3

 * /api/v1/admin/notifications/{id}:
 *   get:
 *     summary: Get Notification Details by ID
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/notifications/mark-all-read:
 *   patch:
 *     summary: Mark All User Notifications As Read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/notifications/{id}/mark-read:
 *   patch:
 *     summary: Mark Single Notification As Read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
