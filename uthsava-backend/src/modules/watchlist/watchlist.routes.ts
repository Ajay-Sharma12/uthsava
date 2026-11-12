import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { watchlistController } from './controllers/watchlist.controller';

const router = Router();

/**
 * Watchlist API Routes
 * Base Path: /api/v1/watchlist
 *
 * All routes require JWT authentication.
 */
router.use(authenticate);

/**
 * GET /api/v1/watchlist
 * Retrieve the authenticated user's profile watchlist with pagination.
 * Query Params: ?page=1&limit=20
 * Header: id: <Profile_ID>  (optional — resolves default profile if omitted)
 */
router.get('/', watchlistController.getWatchlist.bind(watchlistController));

/**
 * POST /api/v1/watchlist
 * Add, Remove, or Toggle a content item in the watchlist.
 * Body: {
 *   "contentId": "<ObjectId>",    (required)
 *   "action": "add" | "remove" | "toggle"   (optional — defaults to "toggle")
 * }
 * Header: id: <Profile_ID>  (optional)
 */
router.post('/', watchlistController.manageWatchlist.bind(watchlistController));

export default router;
