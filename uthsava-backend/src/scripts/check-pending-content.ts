import mongoose from "mongoose";
import { Content, ContentStatus, ContentApprovalStatus } from "../models/content.model";
import { User } from "../models/user.model";
import { Role } from "../common/types/auth.types";
import { logger } from "../core/constants/logger";

/**
 * Quick diagnostic script to check pending content and producer roles
 */
async function checkPendingContent() {
  try {
    logger.info("Checking pending content...");

    // Find all pending content
    const pendingContent = await Content.find({ approvalStatus: ContentApprovalStatus.PENDING })
      .populate("uploadedBy", "role fullName email")
      .select("_id title status approvalStatus uploadedBy uploadedByRole");

    logger.info(`Found ${pendingContent.length} pending content items`);

    if (pendingContent.length > 0) {
      pendingContent.forEach((content: any) => {
        const uploaderRole = (content.uploadedBy as any)?.role || "unknown";
        logger.info(
          `Content: ${content.title}, uploadedByRole: ${content.uploadedByRole}, uploader role: ${uploaderRole}`,
        );
      });
    }

    // Find all producers
    const producers = await User.find({ role: Role.PRODUCER }).select(
      "_id fullName email",
    );
    logger.info(`Found ${producers.length} producers`);

    // Find all content uploaded by producers
    const producerContent = await Content.find({
      uploadedBy: { $in: producers.map((p) => p._id) },
    }).select("_id title status uploadedBy uploadedByRole");

    logger.info(
      `Found ${producerContent.length} content items uploaded by producers`,
    );

    if (producerContent.length > 0) {
      producerContent.forEach((content: any) => {
        logger.info(
          `Content: ${content.title}, status: ${content.status}, uploadedByRole: ${content.uploadedByRole}`,
        );
      });
    }

    // Find pending content from producers
    const pendingProducerContent = await Content.find({
      approvalStatus: ContentApprovalStatus.PENDING,
      uploadedBy: { $in: producers.map((p) => p._id) },
    }).select("_id title status approvalStatus uploadedBy uploadedByRole");

    logger.info(
      `Found ${pendingProducerContent.length} PENDING content items from producers`,
    );

    return {
      totalPending: pendingContent.length,
      totalProducers: producers.length,
      totalProducerContent: producerContent.length,
      pendingProducerContent: pendingProducerContent.length,
    };
  } catch (error) {
    logger.error("Check error:", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/uthsava";

  mongoose
    .connect(mongoUri)
    .then(async () => {
      logger.info("Connected to MongoDB");
      const result = await checkPendingContent();
      logger.info("Check result:", result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Connection error:", error);
      process.exit(1);
    });
}
