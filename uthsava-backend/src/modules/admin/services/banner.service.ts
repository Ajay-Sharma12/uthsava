import { Types } from 'mongoose';
import { Banner, BannerStatus, Content, ContentType, ContentStatus, ContentApprovalStatus, AgeCategory } from '../../../models';
import { resolveMediaUrl } from '../../shared/helpers/url.helper';

export interface BannerListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: BannerStatus;
  type?: string; // 'movie', 'series', 'all'
  isKids?: boolean;
}

export interface ContentSelectOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string; // 'movie', 'series', 'all'
  isKids?: boolean;
}

export class BannerAdminService {
  /**
   * List Banners for Admin Panel with search, pagination, and populated Content details.
   */
  async listBanners(options: BannerListOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (options.status) {
      filter.status = options.status;
    }

    // Aggregate or populate to handle search, content type & kids filters
    const query = Banner.find(filter)
      .populate({
        path: 'contentId',
        select: 'title type poster banner thumbnail ageCategory ageRating status approvalStatus releaseDate releaseYear genreIds languageIds',
        populate: [
          { path: 'genreIds', select: 'name code' },
          { path: 'languageIds', select: 'name code' },
        ],
      })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const allBanners = await query;

    // Filter banners based on populated content fields (search, type, isKids)
    const filtered = allBanners.filter((b: any) => {
      if (!b.contentId) return false;
      const content = b.contentId;

      // Filter by type (movie / series)
      if (options.type && options.type.toLowerCase() !== 'all') {
        const expectedType = options.type.toUpperCase();
        if (content.type !== expectedType) return false;
      }

      // Filter by Kids constraint
      if (options.isKids !== undefined) {
        const isContentKids = content.ageCategory === AgeCategory.KIDS || content.ageRating === 'U';
        if (options.isKids && !isContentKids) return false;
        if (!options.isKids && isContentKids) return false;
      }

      // Filter by search keyword
      if (options.search) {
        const keyword = options.search.toLowerCase();
        const contentTitle = (content.title || '').toLowerCase();
        const customTitle = (b.customTitle || '').toLowerCase();
        if (!contentTitle.includes(keyword) && !customTitle.includes(keyword)) {
          return false;
        }
      }

      return true;
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    // Format response items with resolved media URLs
    const formattedBanners = paginated.map((b: any) => {
      const content = b.contentId || {};
      const posterUrl = resolveMediaUrl(
        (content.poster && content.poster[0]) || content.thumbnail
      );
      const bannerUrl = resolveMediaUrl(
        b.customBannerImage || (content.banner && content.banner[0]) || content.thumbnail
      );

      return {
        id: b._id.toString(),
        contentId: content._id ? content._id.toString() : null,
        title: b.customTitle || content.title || '',
        originalTitle: content.title || '',
        type: content.type || ContentType.MOVIE,
        posterImage: posterUrl,
        bannerImage: bannerUrl,
        customTitle: b.customTitle || null,
        customBannerImage: b.customBannerImage ? resolveMediaUrl(b.customBannerImage) : null,
        displayOrder: b.displayOrder,
        status: b.status,
        startDate: b.startDate || null,
        endDate: b.endDate || null,
        ageCategory: content.ageCategory || null,
        ageRating: content.ageRating || null,
        contentStatus: content.status || null,
        contentApprovalStatus: content.approvalStatus || null,
        genres: content.genreIds || [],
        languages: content.languageIds || [],
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });

    return {
      banners: formattedBanners,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Helper: Search and list active Content (Movies & Series) for Admin to pick when configuring Banners.
   */
  async getSelectableContents(options: ContentSelectOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const query: any = {
      status: ContentStatus.ACTIVE,
      approvalStatus: ContentApprovalStatus.APPROVED,
    };

    // Filter by type
    if (options.type && options.type.toLowerCase() !== 'all') {
      if (options.type.toLowerCase() === 'movie') {
        query.type = ContentType.MOVIE;
      } else if (options.type.toLowerCase() === 'series') {
        query.type = ContentType.SERIES;
      }
    }

    // Filter by kids suitability
    if (options.isKids !== undefined) {
      if (options.isKids) {
        query.$or = [
          { ageCategory: AgeCategory.KIDS },
          { ageRating: 'U' },
        ];
      } else {
        query.ageCategory = AgeCategory.ADULTS;
      }
    }

    // Filter by search keyword
    if (options.search) {
      query.title = { $regex: options.search, $options: 'i' };
    }

    const [totalItems, docs] = await Promise.all([
      Content.countDocuments(query),
      Content.find(query)
        .select('title type poster banner thumbnail ageCategory ageRating releaseYear status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formattedContents = docs.map((doc: any) => ({
      id: doc._id.toString(),
      title: doc.title,
      type: doc.type,
      posterImage: resolveMediaUrl((doc.poster && doc.poster[0]) || doc.thumbnail),
      bannerImage: resolveMediaUrl((doc.banner && doc.banner[0]) || doc.thumbnail),
      ageCategory: doc.ageCategory || null,
      ageRating: doc.ageRating || null,
      releaseYear: doc.releaseYear || (doc.releaseDate ? new Date(doc.releaseDate).getFullYear() : null),
    }));

    return {
      contents: formattedContents,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }

  /**
   * Get single banner by ID
   */
  async getBannerById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_BANNER_ID');
    }

    const banner = await Banner.findById(id)
      .populate({
        path: 'contentId',
        select: 'title type poster banner thumbnail ageCategory ageRating status releaseYear',
      })
      .lean();

    if (!banner) {
      throw new Error('BANNER_NOT_FOUND');
    }

    const content = (banner.contentId as any) || {};
    return {
      id: banner._id.toString(),
      contentId: content._id ? content._id.toString() : null,
      title: banner.customTitle || content.title || '',
      originalTitle: content.title || '',
      type: content.type || ContentType.MOVIE,
      posterImage: resolveMediaUrl((content.poster && content.poster[0]) || content.thumbnail),
      bannerImage: resolveMediaUrl(
        banner.customBannerImage || (content.banner && content.banner[0]) || content.thumbnail
      ),
      customTitle: banner.customTitle || null,
      customBannerImage: banner.customBannerImage ? resolveMediaUrl(banner.customBannerImage) : null,
      displayOrder: banner.displayOrder,
      status: banner.status,
      startDate: banner.startDate || null,
      endDate: banner.endDate || null,
      ageCategory: content.ageCategory || null,
      ageRating: content.ageRating || null,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    };
  }

  /**
   * Create a new banner entry linking to a Content/Series item.
   */
  /**
   * Create a new banner entry linking to a Content/Series item.
   */
  async createBanner(data: any, adminId?: string) {
    const { contentId, customTitle, customBannerImage, displayOrder, status, startDate, endDate } = data;

    if (!Types.ObjectId.isValid(contentId)) {
      throw new Error('INVALID_CONTENT_ID');
    }

    const existingContent = await Content.findById(contentId).lean();
    if (!existingContent) {
      throw new Error('CONTENT_NOT_FOUND');
    }

    // Resolve displayOrder - default to next highest order if not provided
    let finalOrder = displayOrder;
    if (finalOrder === undefined || finalOrder === null) {
      const maxBanner = await Banner.findOne().sort({ displayOrder: -1 }).select('displayOrder').lean();
      finalOrder = maxBanner ? maxBanner.displayOrder + 1 : 1;
    } else {
      // Shift existing banners if target position is already taken (same as tutorial slide service)
      const conflict = await Banner.findOne({ displayOrder: finalOrder });
      if (conflict) {
        await Banner.updateMany(
          { displayOrder: { $gte: finalOrder } },
          { $inc: { displayOrder: 1 } }
        );
      }
    }

    const newBanner = await Banner.create({
      contentId: new Types.ObjectId(contentId),
      customTitle: customTitle || null,
      customBannerImage: customBannerImage || null,
      displayOrder: finalOrder,
      status: status || BannerStatus.ACTIVE,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: adminId && Types.ObjectId.isValid(adminId) ? new Types.ObjectId(adminId) : null,
      updatedBy: adminId && Types.ObjectId.isValid(adminId) ? new Types.ObjectId(adminId) : null,
    });

    return this.getBannerById(newBanner._id.toString());
  }

  /**
   * Update an existing banner entry.
   */
  async updateBanner(id: string, data: any, adminId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_BANNER_ID');
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new Error('BANNER_NOT_FOUND');
    }

    if (data.contentId) {
      if (!Types.ObjectId.isValid(data.contentId)) {
        throw new Error('INVALID_CONTENT_ID');
      }
      const existingContent = await Content.findById(data.contentId).lean();
      if (!existingContent) {
        throw new Error('CONTENT_NOT_FOUND');
      }
      banner.contentId = new Types.ObjectId(data.contentId);
    }

    if (data.customTitle !== undefined) banner.customTitle = data.customTitle || null;
    if (data.customBannerImage !== undefined) banner.customBannerImage = data.customBannerImage || null;

    // Shift display order positions if displayOrder changes (same logic as tutorial slide service)
    if (data.displayOrder !== undefined && data.displayOrder !== banner.displayOrder) {
      const oldSeq = banner.displayOrder;
      const newSeq = Math.max(1, data.displayOrder);

      if (newSeq !== oldSeq) {
        if (newSeq < oldSeq) {
          await Banner.updateMany(
            {
              displayOrder: { $gte: newSeq, $lt: oldSeq },
              _id: { $ne: banner._id },
            },
            { $inc: { displayOrder: 1 } }
          );
        } else {
          await Banner.updateMany(
            {
              displayOrder: { $gt: oldSeq, $lte: newSeq },
              _id: { $ne: banner._id },
            },
            { $inc: { displayOrder: -1 } }
          );
        }
        banner.displayOrder = newSeq;
      }
    }

    if (data.status) banner.status = data.status;
    if (data.startDate !== undefined) banner.startDate = data.startDate ? new Date(data.startDate) : undefined;
    if (data.endDate !== undefined) banner.endDate = data.endDate ? new Date(data.endDate) : undefined;
    if (adminId && Types.ObjectId.isValid(adminId)) banner.updatedBy = new Types.ObjectId(adminId);

    await banner.save();
    return this.getBannerById(id);
  }

  /**
   * Update Banner Status (ACTIVE / INACTIVE)
   */
  async updateStatus(id: string, status: BannerStatus, adminId?: string) {
    return this.updateBanner(id, { status }, adminId);
  }

  /**
   * Delete a banner entry.
   */
  async deleteBanner(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_BANNER_ID');
    }

    const deleted = await Banner.findByIdAndDelete(id);
    if (!deleted) {
      throw new Error('BANNER_NOT_FOUND');
    }

    return true;
  }

  /**
   * Bulk reorder banners display sequence.
   */
  async reorderBanners(bannersArray: Array<{ id: string; displayOrder: number }>, adminId?: string) {
    const validAdminId = adminId && Types.ObjectId.isValid(adminId) ? new Types.ObjectId(adminId) : undefined;

    const bulkOps = bannersArray.map((item) => {
      const updateFields: any = { displayOrder: item.displayOrder };
      if (validAdminId) {
        updateFields.updatedBy = validAdminId;
      }
      return {
        updateOne: {
          filter: { _id: new Types.ObjectId(item.id) },
          update: { $set: updateFields },
        },
      };
    });

    if (bulkOps.length > 0) {
      await Banner.bulkWrite(bulkOps as any);
    }

    return true;
  }
}


export const bannerAdminService = new BannerAdminService();
