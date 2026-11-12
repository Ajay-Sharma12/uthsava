/**
 * @openapi
 * /api/v1/admin/dashboard/stats:
 *   get:
 *     summary: Get Admin Dashboard Statistics
 *     description: Retrieve overview statistics for total users, producers, active content, revenue, pending approvals, and system metrics.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully.
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
 *                   example: Dashboard statistics retrieved
 *                 results:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 1250
 *                     totalProducers:
 *                       type: integer
 *                       example: 48
 *                     totalContents:
 *                       type: integer
 *                       example: 320
 *                     pendingApprovals:
 *                       type: integer
 *                       example: 14
 *                     activeSubscriptions:
 *                       type: integer
 *                       example: 980
 *                     monthlyRevenue:
 *                       type: number
 *                       example: 45200.50
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
