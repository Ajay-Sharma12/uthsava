import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { homeController } from './controllers/home.controller';

const router = Router();

/**
 * Home Screen API Routes
 * Base Path: /api/v1/home
 */

// All watch progress routes require authentication
router.use(authenticate);

// 1. Get Metadata for Home Screen (categories, genres, random banner items)
// GET /api/v1/home/metadata
// Header: id: <Account_Profile_ID>
// Query: ?categoryId=<Category_ID_Or_Name>
router.get('/metadata', homeController.getMetaData.bind(homeController));

// 2. Get Filtered Content Data for Home Screen (recommended for you, upcoming release, top rated, your next watch, morelikethis)
// GET /api/v1/home/content
// Header: id: <Account_Profile_ID>
// Query: ?genreId=<Genre_ID>&categoryId=<Category_ID>&type=<Section_Type>&excludeId=<Content_ID>
router.get('/content', homeController.getSections.bind(homeController));

// 3. Get Content Details (Movie / Series with Seasons & Episodes)
// GET /api/v1/home/content/:id
// Header: id: <Account_Profile_ID>
router.get('/content/:id', homeController.getContentDetail.bind(homeController));

export default router;
