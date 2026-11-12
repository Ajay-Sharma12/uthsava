import mongoose from "mongoose";
import { Content } from "../models/content.model";
import { User } from "../models/user.model";
import { Role } from "../common/types/auth.types";
import { logger } from "../core/constants/logger";

/**
 * Migration script to populate uploadedByRole field for existing content
 * Run this once to backfill the uploadedByRole field based on the uploader's actual role
 */
async function migrateUploadedByRole() {
  try {
    logger.info("Starting uploadedByRole migration...");

    // Find all content that has uploadedBy but no uploadedByRole
    const contentWithoutRole = await Content.find({
      uploadedBy: { $ne: null },
      uploadedByRole: { $in: [null, undefined, ""] },
    }).select("_id uploadedBy");

    logger.info(`Found ${contentWithoutRole.length} content items to migrate`);

    let updated = 0;
    let failed = 0;

    for (const content of contentWithoutRole) {
      try {
        // Get the user who uploaded this content
        const user = await User.findById(content.uploadedBy).select("role");

        if (!user) {
          logger.warn(`User not found for content ${content._id}`);
          failed++;
          continue;
        }

        // Determine the role
        let uploadedByRole = "admin"; // default
        if (user.role === Role.PRODUCER) {
          uploadedByRole = "producer";
        } else if (
          user.role === Role.ADMIN ||
          user.role === Role.ADMIN_SUB_USER
        ) {
          uploadedByRole = "admin";
        }

        // Update the content
        await Content.findByIdAndUpdate(
          content._id,
          { uploadedByRole },
          { new: true },
        );

        updated++;
        logger.info(
          `Updated content ${content._id} with uploadedByRole: ${uploadedByRole}`,
        );
      } catch (error) {
        logger.error(`Failed to update content ${content._id}:`, error);
        failed++;
      }
    }

    logger.info(`Migration complete. Updated: ${updated}, Failed: ${failed}`);
    return { updated, failed, total: contentWithoutRole.length };
  } catch (error) {
    logger.error("Migration error:", error);
    throw error;
  }
}

// Export for use in other scripts
export { migrateUploadedByRole };

// Run if executed directly
if (require.main === module) {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/uthsava";

  mongoose
    .connect(mongoUri)
    .then(async () => {
      logger.info("Connected to MongoDB");
      const result = await migrateUploadedByRole();
      logger.info("Migration result:", result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Connection error:", error);
      process.exit(1);
    });
}
