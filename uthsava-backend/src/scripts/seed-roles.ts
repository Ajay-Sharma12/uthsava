import mongoose from "mongoose";
import dotenv from "dotenv";
import { RoleModel } from "../models/role.model";
import { logger } from "../core/constants/logger";

dotenv.config();

const ALL_MODULES = [
  "dashboard",
  "users",
  "sub_admins",
  "roles",
  "cms_pages",
  "faqs",
  "email_templates",
  "settings",
  "notifications",
  "utils",
  "producers",
  "categories",
  "contents",
  "banners",
  "content_approval",
  "tutorial_slides",
  "avatars",
  "analytics",
  "activity_logs",
  "cms_media",
  "earnings",
  "subscriptions",
  "coupons",
  "producer_payouts",
  "reports",
];

const buildPerms = (modules: string[]) => {
  const perms: Record<string, any> = {};
  for (const mod of ALL_MODULES) {
    const isGranted = modules.includes(mod);
    perms[mod] = {
      view: isGranted,
      create: isGranted,
      edit: isGranted,
      delete: isGranted,
      all: isGranted,
    };
  }
  return perms;
};

const DEFAULT_ROLES = [
  {
    name: "Super Admin",
    description: "Full system administration and unrestricted infrastructure privileges.",
    status: "active",
    permissions: buildPerms(ALL_MODULES),
  },
  {
    name: "Moderator",
    description: "Reviews content quality, approves submissions, and manages community safety.",
    status: "active",
    permissions: buildPerms([
      "dashboard",
      "users",
      "contents",
      "categories",
      "content_approval",
      "banners",
      "avatars",
      "tutorial_slides",
      "faqs",
      "reports",
      "analytics",
      "activity_logs",
    ]),
  },
  {
    name: "Finance",
    description: "Manages subscription plans, revenue transactions, producer payouts, coupons, and financial reporting.",
    status: "active",
    permissions: buildPerms([
      "dashboard",
      "subscriptions",
      "earnings",
      "producer_payouts",
      "coupons",
      "reports",
      "analytics",
      "activity_logs",
    ]),
  },
  {
    name: "Producer",
    description: "Manages catalog uploads, movies, series, promotional banners, and revenue share payouts.",
    status: "active",
    permissions: buildPerms([
      "dashboard",
      "contents",
      "categories",
      "banners",
      "avatars",
      "producer_payouts",
      "reports",
      "analytics",
    ]),
  },
  {
    name: "Content Manager",
    description: "Manages video assets, series catalog, categories, promotional banners, and review queues.",
    status: "active",
    permissions: buildPerms([
      "dashboard",
      "contents",
      "categories",
      "content_approval",
      "banners",
      "avatars",
      "cms_pages",
      "cms_media",
      "tutorial_slides",
      "faqs",
      "notifications",
      "reports",
      "analytics",
    ]),
  },
  {
    name: "Support Lead",
    description: "Manages user accounts, customer service inquiries, tutorials, FAQs, and notifications.",
    status: "active",
    permissions: buildPerms([
      "dashboard",
      "users",
      "tutorial_slides",
      "faqs",
      "email_templates",
      "notifications",
      "reports",
      "analytics",
      "activity_logs",
    ]),
  },
];

async function seedRoles() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    logger.error("MONGO_URI not found in environment variables");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    logger.info("Connected to MongoDB successfully for Role Seeding.");

    for (const roleDef of DEFAULT_ROLES) {
      const existing = await RoleModel.findOne({
        name: { $regex: new RegExp(`^${roleDef.name}$`, "i") },
      });

      if (existing) {
        existing.description = roleDef.description;
        existing.status = roleDef.status as any;
        existing.permissions = roleDef.permissions as any;
        await existing.save();
        logger.info(`Updated existing role: ${roleDef.name}`);
      } else {
        await RoleModel.create(roleDef);
        logger.info(`Created default role: ${roleDef.name}`);
      }
    }

    logger.info("Roles and permissions successfully seeded & updated!");
    process.exit(0);
  } catch (error) {
    logger.error("Failed to seed roles:", error);
    process.exit(1);
  }
}

seedRoles();
