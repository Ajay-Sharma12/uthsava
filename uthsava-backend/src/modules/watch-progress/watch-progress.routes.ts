import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { watchProgressController } from './controllers/watch-progress.controller';

const router = Router();

/**
 * Watch Progress API Routes
 * Base Path: /api/v1/watch-progress
 */

// All watch progress routes require authentication
router.use(authenticate);

// All watch progress routes require authentication
router.use(authenticate);

// Update playback progress position
router.post('/', watchProgressController.updateProgress.bind(watchProgressController));

// List Continue Watching for profile
router.get('/', watchProgressController.getContinueWatchingList.bind(watchProgressController));

// Remove item from Continue Watching
router.delete('/:id', watchProgressController.removeFromContinueWatching.bind(watchProgressController));

export default router;
