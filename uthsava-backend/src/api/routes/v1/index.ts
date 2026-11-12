import { Router } from "express";
import authRoutes from "../../../modules/auth/auth.routes";
import adminRoutes from "../../../modules/admin/admin.routes";
import cmsRoutes from "../../../modules/cms/cms.routes";
import publicPagesRoutes from "../public-pages.routes";
import faqRoutes from "../../../modules/faq/faq.routes";
import utilRoutes from "../../../modules/util/util.routes";
import profileRoutes from "../../../modules/profile/profile.routes";
// import chatRoutes from "../../../modules/chat/routes/chat.routes";
import notificationRoutes from "../../../modules/notification/notification.routes";
import cronRoutes from "../../../modules/cron/cron.routes";
import publicSettingsRoutes from "../../../modules/shared/routes/public-settings.routes";
import languagesRoutes from "../../../modules/shared/routes/languages.routes";
import contentCategoryRoutes from "../../../modules/content-category/content-category.routes";
import tutorialSlideRoutes from "../../../modules/tutorial/tutorial-slide.routes";
import avatarRoutes from "../../../modules/avatar/avatar.routes";
import homeRoutes from "../../../modules/home/home.routes";
import watchlistRoutes from "../../../modules/watchlist/watchlist.routes";
import watchProgressRoutes from "../../../modules/watch-progress/watch-progress.routes";
import { authenticate } from "../../../core/middleware/auth.middleware";
import { getMyGenres } from "../../../modules/auth/controllers/user-auth.controller";

const router = Router();

/**
 * API v1 Routes
 * /api/v1/auth/*          - Public user authentication
 * /api/v1/admin/*         - Admin authentication & operations
 * /api/v1/cms/*           - Public CMS pages (by slug)
 * /api/v1/pages           - Public static pages (query-based: ?slug=)
 * /api/v1/static/*        - Named static pages (about-us, privacy-policy, terms-and-conditions)
 * /api/v1/faqs            - Public FAQ listing
 * /api/v1/settings        - Public application settings
 * /api/v1/util/*          - General utility endpoints
 * /api/v1/profile/*       - User profile management
 * /api/v1/notifications/* - User notifications
 * /api/v1/avatars         - Avatars listing & creation
 * /api/v1/home            - Home Screen & Content Details payload
 * /api/v1/watchlist       - User watchlist operations
 * /api/v1/watch-progress  - Playback position & continue watching
 */

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/cms", cmsRoutes);
router.use("/pages", publicPagesRoutes);
router.use("/faqs", faqRoutes);
router.use("/settings", publicSettingsRoutes);
router.use("/languages", languagesRoutes);
router.use("/util", utilRoutes);
router.use("/profile", profileRoutes);
// router.use("/chat", chatRoutes);
router.use("/notifications", notificationRoutes);
router.use("/cron", cronRoutes);
router.use("/categories", contentCategoryRoutes);
router.use("/category", contentCategoryRoutes);
router.use("/tutorial-slides", tutorialSlideRoutes);
router.use("/avatars", avatarRoutes);
router.use("/avatar-category", avatarRoutes);
router.use("/home", homeRoutes);
router.use("/watchlist", watchlistRoutes);
router.use("/watch-progress", watchProgressRoutes);
router.get("/my-genres", authenticate, getMyGenres);

export default router;

