/**
 * @openapi
 * /api/v1/admin/utils/presigned-url:
 *   post:
 *     summary: Generate AWS S3 Presigned Upload URL
 *     description: Generate a temporary presigned S3 upload URL for uploading images, posters, thumbnails, and videos directly to AWS S3.
 *     tags:
 *       - Utility
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PresignedUrlRequest'
 *     responses:
 *       200:
 *         description: Presigned URL generated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PresignedUrlResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
