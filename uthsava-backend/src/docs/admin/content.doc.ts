/**
 * @openapi
 * /api/v1/admin/contents:
 *   get:
 *     summary: List Content Items (Paginated)
 *     description: Retrieve list of movies and series with search, contentType, status, genre, and producer filters.
 *     tags:
 *       - Content
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
 *         description: Search by title or description
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MOVIE, SERIES]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING, APPROVED, REJECTED, ACTIVE, INACTIVE]
 *       - in: query
 *         name: genreId
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: producerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create New Content (Movie / Series)
 *     description: Add a new movie or web series to the catalog. Accepts JSON or multipart normalized form data.
 *     tags:
 *       - Content
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
 *               - type
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 example: The Cosmic Odyssey
 *               type:
 *                 type: string
 *                 enum: [MOVIE, SERIES]
 *                 example: MOVIE
 *               description:
 *                 type: string
 *                 example: An interstellar voyage into unexplored galaxies.
 *               shortDescription:
 *                 type: string
 *                 example: Sci-fi blockbuster movie
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["651a2b3c4d5e6f7a8b9c0d12"]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["SCI-FI", "SPACE"]
 *               cast:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Actor A", "Actor B"]
 *               crew:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Director X"]
 *               language:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["English", "Hindi"]
 *               thumbnailUrl:
 *                 type: string
 *                 example: https://cdn.example.com/thumb.jpg
 *               posterUrl:
 *                 type: string
 *                 example: https://cdn.example.com/poster.jpg
 *               videoUrl:
 *                 type: string
 *                 example: https://cdn.example.com/movie.mp4
 *               trailerUrl:
 *                 type: string
 *                 example: https://cdn.example.com/trailer.mp4
 *               isFree:
 *                 type: boolean
 *                 example: false
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PENDING, ACTIVE]
 *                 example: DRAFT
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/schemas/ValidationErrorResponse'

 * /api/v1/admin/contents/rejected/list:
 *   get:
 *     summary: List Producer Rejected Content
 *     description: Retrieve list of content submitted by producer that was rejected by admin.
 *     tags:
 *       - Content
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'

 * /api/v1/admin/contents/video-duration:
 *   post:
 *     summary: Get Video Duration (ffmpeg)
 *     description: Extract video duration in seconds for an S3 video object key.
 *     tags:
 *       - Content
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoKey
 *             properties:
 *               videoKey:
 *                 type: string
 *                 example: content/videos/movie_123.mp4
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
 *                 duration:
 *                   type: number
 *                   example: 5400

 * /api/v1/admin/contents/{contentId}:
 *   get:
 *     summary: Get Content Details
 *     description: Retrieve full details of a movie or series including genres, seasons, and metadata.
 *     tags:
 *       - Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update Content Item
 *     description: Update details for an existing movie or series.
 *     tags:
 *       - Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
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
 *                 example: The Cosmic Odyssey (Extended Cut)
 *               description:
 *                 type: string
 *                 example: Extended sci-fi masterpiece.
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete Content
 *     description: Soft delete or purge content item and its associated media.
 *     tags:
 *       - Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/status:
 *   patch:
 *     summary: Update Content Status
 *     description: Toggle status between ACTIVE and INACTIVE.
 *     tags:
 *       - Content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
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
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/seasons:
 *   get:
 *     summary: List Seasons of a Series
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   post:
 *     summary: Add Season to Series
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
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
 *               - seasonNumber
 *               - title
 *             properties:
 *               seasonNumber:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: Season 1
 *               description:
 *                 type: string
 *                 example: First Season
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/seasons/{seasonId}:
 *   get:
 *     summary: Get Season Details
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Season Details
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seasonId
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
 *                 example: Season 1 - The Beginning
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete Season
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/seasons/{seasonId}/episodes:
 *   get:
 *     summary: List Episodes of a Season
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   post:
 *     summary: Add Episode to Season
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seasonId
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
 *               - episodeNumber
 *               - title
 *               - videoUrl
 *             properties:
 *               episodeNumber:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: Pilot
 *               description:
 *                 type: string
 *                 example: The pilot episode
 *               videoUrl:
 *                 type: string
 *                 example: https://cdn.example.com/ep1.mp4
 *               durationInSeconds:
 *                 type: integer
 *                 example: 2400
 *     responses:
 *       201:
 *         $ref: '#/components/schemas/SuccessResponse'

 * /api/v1/admin/contents/{contentId}/seasons/{seasonId}/episodes/{episodeId}:
 *   get:
 *     summary: Get Episode Details
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: episodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   put:
 *     summary: Update Episode
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: episodeId
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
 *                 example: Pilot (Remastered)
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete Episode
 *     tags:
 *       - Series & Seasons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: episodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/SuccessResponse'
 */
