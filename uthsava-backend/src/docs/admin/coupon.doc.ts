/**
 * @openapi
 * /api/v1/admin/coupons:
 *   get:
 *     summary: List Coupons (Paginated)
 *     tags:
 *       - Coupons
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
 *           enum: [ACTIVE, INACTIVE, EXPIRED]
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *   post:
 *     summary: Create Coupon Code
 *     tags:
 *       - Coupons
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME50
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *                 example: PERCENTAGE
 *               discountValue:
 *                 type: number
 *                 example: 50
 *               minOrderAmount:
 *                 type: number
 *                 example: 100
 *               maxDiscountAmount:
 *                 type: number
 *                 example: 200
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               usageLimit:
 *                 type: integer
 *                 example: 500
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/coupons/{couponId}:
 *   get:
 *     summary: Get Coupon Details
 *     tags:
 *       - Coupons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Coupon Details
 *     tags:
 *       - Coupons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
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
 *               discountValue:
 *                 type: number
 *                 example: 40
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/coupons/{couponId}/status:
 *   patch:
 *     summary: Update Coupon Status
 *     tags:
 *       - Coupons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
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
 *                 enum: [ACTIVE, INACTIVE, EXPIRED]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/coupons/{couponId}/assign-users:
 *   patch:
 *     summary: Assign Coupon to Specific Users
 *     tags:
 *       - Coupons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
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
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["64f1a2b3c4d5e6f7a8b9c0d1"]
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
