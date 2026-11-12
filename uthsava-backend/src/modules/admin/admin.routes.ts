import { Router } from "express";

// Import all sub-routes
import authRoutes from "./routes/auth.routes";
import utilRoutes from "./routes/util.routes";
import userRoutes from "./routes/user.routes";
import cmsPageRoutes from "./routes/cms-page.routes";
import faqRoutes from "./routes/faq.routes";
import emailTemplateRoutes from "./routes/email-template.routes";
import subAdminRoutes from "./routes/subadmin.routes";
import notificationRoutes from "./routes/notification.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import settingsRoutes from "./routes/settings.routes";
import producerRoutes from "./routes/producer.routes";
import contentCategoryRoutes from "./routes/content-category.routes";
import contentRoutes from "./routes/content.routes";
import bannerRoutes from "./routes/banner.routes";
import couponRoutes from "./routes/coupon.routes";
import awardBadgeRoutes from "./routes/award-badge.routes";
import tutorialSlideRoutes from "./routes/tutorial-slide.routes";
import avatarAdminRoutes from "./routes/avatar.routes";
import { requireSubAdminPermission } from "../../core/middleware/subadmin-permission.middleware";
import { authenticate, authorize, adminInactivityTimeout } from "../../core/middleware/auth.middleware";
import { Role } from "../../common/types/auth.types";
import auditLogRoutes from "./routes/audit-log.routes";
import { roleRoutes } from "./routes/role.routes";

const router = Router();

// Mount all sub-routes (each handles its own protection)
router.use("/auth", authRoutes);
const adminAccess = [
  authenticate,
  // Allow admin, sub-admin, and producer roles to access admin routes.
  // Fine-grained module permissions are enforced by requireSubAdminPermission.
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  adminInactivityTimeout,
];

router.use(
  "/utils",
  adminAccess,
  requireSubAdminPermission("utils"),
  utilRoutes,
);
router.use(
  "/util",
  adminAccess,
  requireSubAdminPermission("utils"),
  utilRoutes,
);
router.use(
  "/users",
  adminAccess,
  requireSubAdminPermission("users"),
  userRoutes,
);
router.use(
  "/cms",
  adminAccess,
  requireSubAdminPermission("cms_pages"),
  cmsPageRoutes,
);
router.use("/faqs", adminAccess, requireSubAdminPermission("faqs"), faqRoutes);
router.use(
  "/email-templates",
  adminAccess,
  requireSubAdminPermission("email_templates"),
  emailTemplateRoutes,
);
router.use(
  "/sub-admins",
  adminAccess,
  requireSubAdminPermission("sub_admins"),
  subAdminRoutes,
);
router.use(
  "/roles",
  adminAccess,
  requireSubAdminPermission("roles"),
  roleRoutes,
);
router.use(
  "/notifications",
  adminAccess,
  notificationRoutes,
);
router.use(
  "/dashboard",
  adminAccess,
  dashboardRoutes,
);
// Both /settings and /platform-settings point to the same router
router.use(
  "/settings",
  adminAccess,
  requireSubAdminPermission("settings"),
  settingsRoutes,
);
router.use(
  "/platform-settings",
  adminAccess,
  requireSubAdminPermission("settings"),
  settingsRoutes,
);
router.use(
  "/coupons",
  adminAccess,
  requireSubAdminPermission("coupons"),
  couponRoutes,
);
router.use(
  "/producers",
  adminAccess,
  requireSubAdminPermission("producers"),
  producerRoutes,
);
router.use(
  "/categories",
  adminAccess,
  requireSubAdminPermission("categories"),
  contentCategoryRoutes,
);
router.use(
  "/contents",
  adminAccess,
  requireSubAdminPermission("contents"),
  contentRoutes,
);
router.use(
  "/banners",
  adminAccess,
  requireSubAdminPermission("banners"),
  bannerRoutes,
);
router.use(
  "/award-badges",
  adminAccess,
  requireSubAdminPermission("award_badges"),
  awardBadgeRoutes,
);
router.use(
  "/tutorial-slides",
  adminAccess,
  requireSubAdminPermission("tutorial_slides"),
  tutorialSlideRoutes,
);

// We'll skip granular sub-admin permission for now, or just use adminAccess directly.
// Normally you'd want something like requireSubAdminPermission("audit_logs") if defined in SubAdmin modules.
// Assuming "audit_logs" might not be in the enum yet, we'll let all admins access or limit to those with "dashboard" / "users" access.
// Let's just use adminAccess for now.
router.use(
  "/audit-logs",
  adminAccess,
  auditLogRoutes,
);


router.use(
  "/avatars",
  adminAccess,
  requireSubAdminPermission("avatars"),
  avatarAdminRoutes,
);

export default router;
