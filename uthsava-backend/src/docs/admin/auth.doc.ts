/**
 * @openapi
 * /api/v1/admin/auth/login:
 *   post:
 *     summary: Admin Login
 *     description: Authenticate Admin, Sub-Admin, or Producer account and obtain JWT tokens.
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@uthsava.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@12345
 *               rememberMe:
 *                 type: boolean
 *                 example: true
 *               deviceId:
 *                 type: string
 *                 example: dev_123456
 *               deviceType:
 *                 type: string
 *                 example: WEB
 *               deviceToken:
 *                 type: string
 *                 example: token_xyz
 *     responses:
 *       200:
 *         description: Login successful.
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
 *                   example: Login successful
 *                 results:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     refreshToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials or inactive account.
 *         $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/schemas/ValidationErrorResponse'

 * /api/v1/admin/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT Access Token
 *     description: Exchange a valid refresh token for a new access token.
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully.
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
 *                   example: Token refreshed successfully
 *                 results:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'

 * /api/v1/admin/auth/forgot-password:
 *   post:
 *     summary: Request Password Reset Link
 *     description: Send a password reset link to the registered admin email address.
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@uthsava.com
 *               origin:
 *                 type: string
 *                 example: https://admin.uthsava.com
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/schemas/ValidationErrorResponse'

 * /api/v1/admin/auth/verify-reset-token:
 *   post:
 *     summary: Verify Password Reset Token
 *     description: Validate whether a password reset token is valid and not expired.
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: 8f7e6d5c4b3a2109
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'

 * /api/v1/admin/auth/reset-password:
 *   post:
 *     summary: Reset Password
 *     description: Set a new password using a verified reset token.
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: 8f7e6d5c4b3a2109
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewAdmin@12345
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: NewAdmin@12345
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/schemas/ValidationErrorResponse'

 * /api/v1/admin/auth/profile:
 *   get:
 *     summary: Get Logged-in Admin Profile
 *     description: Retrieve details of the currently authenticated admin user.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details retrieved.
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
 *                   example: Profile fetched successfully
 *                 results:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update Logged-in Admin Profile
 *     description: Update first name, last name, or profile image of the current user.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               profileImage:
 *                 type: string
 *                 example: https://cdn.example.com/profiles/avatar.jpg
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/schemas/ValidationErrorResponse'

 * /api/v1/admin/auth/change-password:
 *   post:
 *     summary: Change Admin Password
 *     description: Change the current user's password.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: CurrentPassword@123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewStrongPassword@123
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: NewStrongPassword@123
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/schemas/ValidationErrorResponse'

 * /api/v1/admin/auth/logout:
 *   post:
 *     summary: Admin Logout
 *     description: Invalidate active user session or token.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
