import { FilterQuery, Types } from "mongoose";
import { Avatar, IAvatar, AvatarStatus } from "../../../models/avatar.model";
import { logger } from "../../../core/constants/logger";
import { config } from "../../../core/config";
import { PaginationParams } from "../../shared/helpers/pagination.helper";
import { S3Service } from "../../shared/services/s3.service";

export interface CreateAvatarCategoryInput {
  category: string;
  isKids?: boolean;
  images?: string[];
  status?: AvatarStatus;
  createdBy?: string;
}

export interface UpdateAvatarCategoryInput {
  category?: string;
  isKids?: boolean;
  images?: string[];
  status?: AvatarStatus;
  updatedBy?: string;
}

export interface AdminAvatarFilters {
  search?: string;
  isKids?: boolean;
  status?: AvatarStatus;
  fromDate?: string;
  toDate?: string;
}

export class AvatarService {
  /**
   * Resolves a stored S3 key or relative path to a full CloudFront URL.
   * If the value already starts with http:// or https://, it is returned as-is.
   */
  static resolveMediaUrl(key?: string | null): string {
    if (!key || key.trim() === "") return "";
    if (key.startsWith("http://") || key.startsWith("https://")) return key;
    const baseUrl = config.aws?.cloudFrontUrl || "";
    return baseUrl ? `${baseUrl}/${key.replace(/^\/+/, "")}` : key;
  }

  /**
   * Formats a single Avatar category document with resolved CloudFront image URLs for every image.
   */
  static formatAvatarDoc(avatar: any) {
    const rawImages: string[] = Array.isArray(avatar.images) ? avatar.images : [];
    const resolvedImageUrls = rawImages.map((imgKey: string) => AvatarService.resolveMediaUrl(imgKey));

    let createdByObj = avatar.createdBy;
    if (avatar.createdBy && typeof avatar.createdBy === "object" && avatar.createdBy._id) {
      createdByObj = {
        _id: avatar.createdBy._id,
        id: avatar.createdBy._id.toString(),
        name: avatar.createdBy.fullName || avatar.createdBy.name || `${avatar.createdBy.firstName || ""} ${avatar.createdBy.lastName || ""}`.trim() || avatar.createdBy.email || "Admin",
        email: avatar.createdBy.email,
      };
    }

    return {
      _id: avatar._id,
      id: avatar._id.toString(),
      category: avatar.category,
      description: avatar.description || "",
      isKids: Boolean(avatar.isKids),
      totalImages: resolvedImageUrls.length,
      images: resolvedImageUrls,
      rawImageKeys: rawImages,
      status: avatar.status || AvatarStatus.ACTIVE,
      createdAt: avatar.createdAt,
      updatedAt: avatar.updatedAt,
      createdBy: createdByObj,
      updatedBy: avatar.updatedBy,
    };
  }

  /**
   * Create a new Avatar category document or append images to an existing category.
   */
  static async createAvatar(input: any, createdBy?: string): Promise<any> {
    try {
      const creatorId = createdBy ? new Types.ObjectId(createdBy) : null;

      const categoryName = (input.category || input.categoryName || "General").trim();
      const isKidsFlag = input.isKids === true || input.isKids === "true" || input.isKids === 1 || input.isKids === "1";
      const description = input.description !== undefined ? String(input.description).trim() : "";

      // Extract array of images from body
      let incomingImages: string[] = [];

      if (Array.isArray(input.images)) {
        incomingImages = input.images
          .map((item: any) => (typeof item === "string" ? item.trim() : (item.image || item.url || "").trim()))
          .filter((url: string) => url !== "");
      } else if (typeof input.image === "string" && input.image.trim() !== "") {
        incomingImages = [input.image.trim()];
      }

      const status = input.status || AvatarStatus.ACTIVE;

      if (incomingImages.length > 10) {
        throw new Error("Cannot upload more than 10 avatar images per category");
      }

      // Check if category document already exists in DB
      let avatarDoc = await Avatar.findOne({
        category: { $regex: new RegExp(`^${categoryName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
      });

      if (avatarDoc) {
        // Update images list and settings
        avatarDoc.images = incomingImages.length > 0 ? incomingImages : avatarDoc.images;
        avatarDoc.isKids = isKidsFlag;
        avatarDoc.status = status;
        if (description) avatarDoc.description = description;
        if (creatorId) avatarDoc.updatedBy = creatorId;
        await avatarDoc.save();
        logger.info(`[AvatarService] Updated existing avatar category '${categoryName}'`);
      } else {
        // Create new Avatar category document
        avatarDoc = new Avatar({
          category: categoryName,
          description: description,
          isKids: isKidsFlag,
          images: incomingImages,
          status: status,
          createdBy: creatorId,
        });
        await avatarDoc.save();
        logger.info(`[AvatarService] Created new avatar category '${categoryName}' with ${incomingImages.length} images`);
      }

      if (creatorId) {
        await avatarDoc.populate("createdBy", "firstName lastName fullName email name");
      }

      return AvatarService.formatAvatarDoc(avatarDoc);
    } catch (error) {
      logger.error("[AvatarService] Error creating avatar category:", error);
      throw error;
    }
  }

  /**
   * Admin Listing: Get paginated list of avatars with search and filters.
   */
  static async listAdminAvatars(pagination: PaginationParams, filters: AdminAvatarFilters) {
    try {
      const query: FilterQuery<IAvatar> = {};

      if (filters.search && filters.search.trim() !== "") {
        const searchRegex = new RegExp(filters.search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
        query.$or = [{ category: searchRegex }];
      }

      if (filters.isKids !== undefined) {
        query.isKids = filters.isKids;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.fromDate || filters.toDate) {
        query.createdAt = {};
        if (filters.fromDate) {
          query.createdAt.$gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          query.createdAt.$lte = new Date(filters.toDate);
        }
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const sortField = pagination.sortBy || "createdAt";
      const sortDirection = pagination.sortOrder === "asc" ? 1 : -1;
      const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

      const [docs, totalCount] = await Promise.all([
        Avatar.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .populate("createdBy", "firstName lastName fullName email name"),
        Avatar.countDocuments(query),
      ]);

      const formattedDocs = docs.map((doc) => AvatarService.formatAvatarDoc(doc));
      const totalPages = Math.ceil(totalCount / limit) || 1;

      return {
        data: formattedDocs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error("[AvatarService] Error listing admin avatars:", error);
      throw error;
    }
  }

  /**
   * Get single Avatar Category by ID.
   */
  static async getAvatarById(id: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      const avatarDoc = await Avatar.findById(id).populate("createdBy", "firstName lastName fullName email name");
      if (!avatarDoc) return null;
      return AvatarService.formatAvatarDoc(avatarDoc);
    } catch (error) {
      logger.error(`[AvatarService] Error fetching avatar by id ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update existing Avatar Category by ID.
   * Permanently deletes any removed images from S3 storage to avoid orphaned files.
   */
  static async updateAvatar(id: string, input: any, updatedBy?: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      const avatarDoc = await Avatar.findById(id);
      if (!avatarDoc) return null;

      if (input.category !== undefined && input.category.trim() !== "") {
        avatarDoc.category = input.category.trim();
      }

      if (input.description !== undefined) {
        avatarDoc.description = String(input.description).trim();
      }

      if (input.isKids !== undefined) {
        avatarDoc.isKids = input.isKids === true || input.isKids === "true" || input.isKids === 1 || input.isKids === "1";
      }

      if (input.status !== undefined) {
        avatarDoc.status = input.status;
      }

      if (Array.isArray(input.images)) {
        const processedImages = input.images
          .map((item: any) => (typeof item === "string" ? item.trim() : (item.image || item.url || "").trim()))
          .filter((url: string) => url !== "");

        if (processedImages.length > 10) {
          throw new Error("Cannot upload more than 10 avatar images per category");
        }

        // Find removed images and delete them permanently from S3
        const oldImages = avatarDoc.images || [];
        const removedKeys = oldImages.filter((oldKey) => !processedImages.includes(oldKey));

        for (const key of removedKeys) {
          try {
            await S3Service.deleteFile(key);
            logger.info(`[AvatarService] Permanently deleted removed image key from S3: ${key}`);
          } catch (s3Err) {
            logger.error(`[AvatarService] Failed to delete S3 file ${key}:`, s3Err);
          }
        }

        avatarDoc.images = processedImages;
      }

      if (updatedBy) {
        avatarDoc.updatedBy = new Types.ObjectId(updatedBy);
      }

      await avatarDoc.save();
      await avatarDoc.populate("createdBy", "firstName lastName fullName email name");
      logger.info(`[AvatarService] Updated avatar category ID: ${id}`);
      return AvatarService.formatAvatarDoc(avatarDoc);
    } catch (error) {
      logger.error(`[AvatarService] Error updating avatar ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Toggle Avatar Status (active / inactive).
   */
  static async updateAvatarStatus(id: string, status: AvatarStatus, updatedBy?: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      const avatarDoc = await Avatar.findById(id);
      if (!avatarDoc) return null;

      avatarDoc.status = status;
      if (updatedBy) {
        avatarDoc.updatedBy = new Types.ObjectId(updatedBy);
      }

      await avatarDoc.save();
      await avatarDoc.populate("createdBy", "firstName lastName fullName email name");
      logger.info(`[AvatarService] Updated status to '${status}' for avatar ID ${id}`);
      return AvatarService.formatAvatarDoc(avatarDoc);
    } catch (error) {
      logger.error(`[AvatarService] Error updating avatar status ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete Avatar Category by ID.
   * Permanently deletes all associated avatar images from S3 storage before deleting document.
   */
  static async deleteAvatar(id: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return false;
      }
      const avatarDoc = await Avatar.findById(id);
      if (!avatarDoc) return false;

      // Permanently delete all stored avatar images from S3
      if (Array.isArray(avatarDoc.images)) {
        for (const key of avatarDoc.images) {
          try {
            await S3Service.deleteFile(key);
            logger.info(`[AvatarService] Permanently deleted image from S3: ${key}`);
          } catch (s3Err) {
            logger.error(`[AvatarService] Failed to delete S3 key ${key}:`, s3Err);
          }
        }
      }

      await Avatar.findByIdAndDelete(id);
      return true;
    } catch (error) {
      logger.error(`[AvatarService] Error deleting avatar ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Fetch active avatar categories for Mobile / TV app with pagination.
   * Filters by isKids (boolean) and optional category (string).
   * Attaches full CloudFront URLs to every image in the images array.
   */
  static async getActiveAvatars(
    isKids?: boolean,
    category?: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const query: FilterQuery<IAvatar> = { status: AvatarStatus.ACTIVE };

      if (isKids !== undefined) {
        query.isKids = isKids;
      }

      if (category && category.trim() !== "") {
        query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
      }

      const skip = (page - 1) * limit;

      const [avatarDocs, totalCount] = await Promise.all([
        Avatar.find(query)
          .sort({ category: 1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Avatar.countDocuments(query),
      ]);

      const formattedCategories = avatarDocs.map((doc) => AvatarService.formatAvatarDoc(doc));
      const totalPages = Math.ceil(totalCount / limit) || 1;

      return {
        totalCategories: totalCount,
        categories: formattedCategories,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error("[AvatarService] Error fetching active avatars:", error);
      throw error;
    }
  }

  /**
   * List all distinct active avatar categories for dropdown selection.
   * Returns category names list only (no images or extra metadata).
   */
  static async listAvatarCategories() {
    try {
      const avatarDocs = await Avatar.find({ status: AvatarStatus.ACTIVE }).sort({ category: 1 });
      return avatarDocs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.category,
        category: doc.category,
        isKids: Boolean(doc.isKids),
        status: doc.status || AvatarStatus.ACTIVE,
      }));
    } catch (error) {
      logger.error("[AvatarService] Error listing avatar categories:", error);
      throw error;
    }
  }

  /**
   * Create a new standalone Avatar Category document.
   */
  static async createAvatarCategory(input: { category?: string; name?: string; description?: string; isKids?: boolean; status?: AvatarStatus }, createdBy?: string) {
    try {
      const creatorId = createdBy ? new Types.ObjectId(createdBy) : null;
      const categoryName = (input.category || input.name || "").trim();
      if (!categoryName) {
        throw new Error("validation.categoryNameIsRequired");
      }

      const isKidsFlag = input.isKids === true || (input.isKids as any) === "true" || (input.isKids as any) === 1 || (input.isKids as any) === "1";
      const status = input.status || AvatarStatus.ACTIVE;
      const description = input.description !== undefined ? String(input.description).trim() : "";

      let avatarDoc = await Avatar.findOne({
        category: { $regex: new RegExp(`^${categoryName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
      });

      if (avatarDoc) {
        avatarDoc.isKids = isKidsFlag;
        avatarDoc.status = status;
        if (description) avatarDoc.description = description;
        if (creatorId) avatarDoc.updatedBy = creatorId;
        await avatarDoc.save();
        logger.info(`[AvatarService] Updated existing avatar category '${categoryName}'`);
      } else {
        avatarDoc = new Avatar({
          category: categoryName,
          description: description,
          isKids: isKidsFlag,
          images: [],
          status: status,
          createdBy: creatorId,
        });
        await avatarDoc.save();
        logger.info(`[AvatarService] Created new avatar category '${categoryName}'`);
      }

      if (creatorId) {
        await avatarDoc.populate("createdBy", "firstName lastName fullName email name");
      }

      return AvatarService.formatAvatarDoc(avatarDoc);
    } catch (error) {
      logger.error("[AvatarService] Error creating avatar category:", error);
      throw error;
    }
  }
}
