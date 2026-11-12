import { FilterQuery, Types } from "mongoose";
import {
  Content,
  Genre,
  GenreStatus,
  type,
  IGenre,
  AuditLog,
  AuditModule,
  AuditStatus,
} from "../../../models";
import {
  PaginationParams,
  PaginationHelper,
} from "../../shared/helpers/pagination.helper";
import { logger } from "../../../core/constants/logger";
import { config } from "../../../core/config";

export const CONTENT_CATEGORY_SORT_FIELDS = [
  "name",
  "displayOrder",
  "status",
  "createdAt",
  "updatedAt",
  "contentCount",
] as const;

export const CONTENT_CATEGORY_SEARCH_FIELDS = ["name", "description"] as const;

export const ERROR_MESSAGES = {
  NOT_FOUND: "contentCategory.not_found",
  NAME_EXISTS: "contentCategory.name_exists",
  DISPLAY_ORDER_EXISTS: "contentCategory.display_order_exists",
  MAPPED_TO_CONTENT: "contentCategory.mapped_to_content",
  INVALID_TYPE: "contentCategory.invalid_type",
} as const;

export class ContentCategoryService {


  private static formatItem(doc: any, contentCount = 0) {
    const obj = doc.toObject ? doc.toObject() : { ...doc };

    const formatUserWithDate = (userField: any, dateField: any) => {
      if (!userField) return null;
      if (typeof userField === 'object' && userField._id) {
        return {
          name: userField.fullName || [userField.firstName, userField.lastName].filter(Boolean).join(" ") || "Unknown",
          date: dateField || null,
        };
      }
      return null;
    };

    return {
      _id: obj._id,
      name: obj.name,
      type: obj.type,
      description: obj.description ?? "",
      displayOrder: obj.displayOrder ?? 1,
      status: obj.status,
      contentCount,
      
      /* --- Added Genre Fields requested --- */
      // Genre Image Support
      icon: obj.icon ?? null,
      
      // SEO Metadata
      seoTitle: obj.seoTitle ?? null,
      seoDescription: obj.seoDescription ?? null,
      
      // Audit requirements - with user name and dates combined
      createdBy: formatUserWithDate(obj.createdBy, obj.createdAt),
      updatedBy: formatUserWithDate(obj.updatedBy, obj.updatedAt),
    };
  }

  private static async assertUniqueName(
    name: string,
    type: type,
    excludeId?: string,
  ): Promise<void> {
    const filter: FilterQuery<IGenre> = {
      type,
      name: {
        $regex: new RegExp(
          `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      },
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await Genre.findOne(filter);
    if (existing) {
      throw new Error(ERROR_MESSAGES.NAME_EXISTS);
    }
  }

  private static async assertUniqueDisplayOrder(
    displayOrder: number,
    type: type,
    excludeId?: string,
  ): Promise<void> {
    const filter: FilterQuery<IGenre> = {
      type,
      displayOrder,
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await Genre.findOne(filter);
    if (existing) {
      const err: any = new Error(ERROR_MESSAGES.DISPLAY_ORDER_EXISTS);
      err.existingName = existing.name;
      throw err;
    }
  }

  private static async getContentCountMap(
    ids: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();

    // Both categories and genres are stored in the genreIds field of the Content model
    // Exclude rejected contents from the content count
    const countAgg = await Content.aggregate([
      {
        $match: {
          genreIds: { $in: ids },
          approvalStatus: { $ne: "REJECTED" },
          $or: [
            { rejectionReason: { $exists: false } },
            { rejectionReason: null },
            { rejectionReason: "" },
          ],
        },
      },
      { $unwind: "$genreIds" },
      { $match: { genreIds: { $in: ids } } },
      { $group: { _id: "$genreIds", count: { $sum: 1 } } },
    ]);

    const map = new Map<string, number>();
    for (const { _id, count } of countAgg) {
      map.set(_id.toString(), count);
    }

    return map;
  }

  static async list(
    type: type | undefined,
    pagination: PaginationParams,
    query: FilterQuery<IGenre> = {},
  ) {
    const baseQuery: FilterQuery<IGenre> = {
      ...query,
    };
    if (type) {
      baseQuery.type = type;
    }

    const parsed = PaginationHelper.parseParams(pagination, [
      ...CONTENT_CATEGORY_SORT_FIELDS,
    ]);

    if (parsed.sortBy === "contentCount") {
      return ContentCategoryService.listSortedByContentCount(
        baseQuery,
        parsed,
      );
    }

    const result = await PaginationHelper.paginate(
      Genre,
      baseQuery,
      parsed,
      undefined,
      [
        { path: "createdBy", select: "fullName firstName lastName" },
        { path: "updatedBy", select: "fullName firstName lastName" }
      ]
    );
    const ids = result.data.map((d: any) => new Types.ObjectId(d._id));
    const countMap = await ContentCategoryService.getContentCountMap(ids);

    const typeOnly = type ? { type } : {};
    const [total, active, inactive] = await Promise.all([
      Genre.countDocuments(typeOnly),
      Genre.countDocuments({  
        ...typeOnly,
        status: GenreStatus.ACTIVE,
      }),
      Genre.countDocuments({
        ...typeOnly,
        status: GenreStatus.INACTIVE,
      }),
    ]);

    return {
      data: result.data.map((d: any) =>
        ContentCategoryService.formatItem(
          d,
          countMap.get(d._id.toString()) ?? 0,
        ),
      ),
      pagination: result.pagination,
      counts: { total, active, inactive },
    };
  }

  private static async listSortedByContentCount(
    baseQuery: FilterQuery<IGenre>,
    parsed: Required<PaginationParams>,
  ) {
    const sortDir = parsed.sortOrder === "asc" ? 1 : -1;
    const skip = (parsed.page! - 1) * parsed.limit!;

    const pipeline: any[] = [
      { $match: baseQuery },
      {
        $lookup: {
          from: "contents",
          let: { catId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$catId", { $ifNull: ["$genreIds", []] }] },
                    { $ne: ["$approvalStatus", "REJECTED"] },
                  ],
                },
              },
            },
          ],
          as: "_content",
        },
      },
      { $addFields: { contentCount: { $size: "$_content" } } },
      { $project: { _content: 0 } },
      { $sort: { contentCount: sortDir, displayOrder: 1, name: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: parsed.limit }],
          meta: [{ $count: "totalCount" }],
        },
      },
    ];

    const typeOnly = baseQuery.type ? { type: baseQuery.type } : {};
    const [aggResult, total, active, inactive] = await Promise.all([
      Genre.aggregate(pipeline),
      Genre.countDocuments(typeOnly),
      Genre.countDocuments({
        ...typeOnly,
        status: GenreStatus.ACTIVE,
      }),
      Genre.countDocuments({
        ...typeOnly,
        status: GenreStatus.INACTIVE,
      }),
    ]);

    const facet = aggResult[0] || { data: [], meta: [] };
    
    if (facet.data && facet.data.length > 0) {
      await Genre.populate(facet.data, [
        { path: "createdBy", select: "fullName firstName lastName" },
        { path: "updatedBy", select: "fullName firstName lastName" }
      ]);
    }

    const filteredTotal = facet.meta[0]?.totalCount ?? 0;
    const totalCount = filteredTotal;
    const totalPages = Math.ceil(totalCount / parsed.limit!) || 1;

    return {
      data: facet.data.map((d: any) =>
        ContentCategoryService.formatItem(d, d.contentCount ?? 0),
      ),
      pagination: {
        currentPage: parsed.page!,
        totalPages,
        totalCount,
        limit: parsed.limit!,
        hasNextPage: parsed.page! < totalPages,
        hasPrevPage: parsed.page! > 1,
      },
      counts: { total, active, inactive },
    };
  }

  /** Active categories/genres for public content upload & filtering */
  static async listActive(type: type) {
    const items = await Genre.find({
      type,
      status: GenreStatus.ACTIVE,
    })
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    return items.map((item) => ContentCategoryService.formatItem(item, 0));
  }

  /**
   * Dedicated Mobile Service: Get listing of active categories with pagination support.
   * Resolves icon URLs using CloudFront configuration.
   * Filters strictly by type: "category" by default (excluding "genre").
   *
   * @param typeFilter - Optional type filter: "category", "genre", or "all" (defaults to "category")
   * @param page - Optional page number
   * @param limit - Optional items per page
   */
  static async listActiveMobile(typeFilter?: string, page?: number, limit?: number) {
    const targetType = (typeFilter && typeFilter !== "all") ? typeFilter : type.CATEGORY;

    const query: FilterQuery<IGenre> = {
      status: GenreStatus.ACTIVE,
    };

    if (targetType === type.CATEGORY || targetType === type.GENRE) {
      query.type = targetType as type;
    }

    const p = Math.max(1, page || 1);
    const l = Math.min(100, Math.max(1, limit || 10));
    const skip = (p - 1) * l;

    const [items, totalCount] = await Promise.all([
      Genre.find(query)
        .sort({ displayOrder: 1, name: 1 })
        .skip(skip)
        .limit(l)
        .lean(),
      Genre.countDocuments(query),
    ]);

    const baseUrl = config.aws?.cloudFrontUrl || "";

    const categories = items.map((item) => {
      let iconUrl: string | null = null;
      if (item.icon && item.icon.trim() !== "") {
        iconUrl = item.icon.startsWith("http://") || item.icon.startsWith("https://")
          ? item.icon
          : `${baseUrl}/${item.icon.replace(/^\/+/, "")}`;
      }

      return {
        id: item._id.toString(),
        name: item.name,
        type: item.type,
        icon: iconUrl,
        description: item.description || "",
        displayOrder: item.displayOrder || 0,
        status: item.status,
      };
    });

    const totalPages = Math.ceil(totalCount / l) || 1;

    return {
      total: totalCount,
      totalCount,
      categories,
      pagination: {
        page: p,
        limit: l,
        totalCount,
        totalPages,
        hasNextPage: p < totalPages,
        hasPrevPage: p > 1,
      },
    };
  }

  static async getById(
    id: string,
  ): Promise<ReturnType<typeof ContentCategoryService.formatItem> | null> {
    const item = await Genre.findById(id).populate([
      { path: "createdBy", select: "fullName firstName lastName" },
      { path: "updatedBy", select: "fullName firstName lastName" }
    ]);
    if (!item) return null;

    const countMap = await ContentCategoryService.getContentCountMap([new Types.ObjectId(item._id)]);
    const contentCount = countMap.get(item._id.toString()) || 0;

    return ContentCategoryService.formatItem(item, contentCount);
  }

  static async create(data: {
    name: string;
    type: type;
    description?: string;
    displayOrder?: number;
    status?: GenreStatus;
    icon?: string;
    seoTitle?: string;
    seoDescription?: string;
  }, adminId?: string) {
    const name = data.name.trim();
    await ContentCategoryService.assertUniqueName(name, data.type);

    const displayOrder = Math.max(1, data.displayOrder ?? 1);
    await ContentCategoryService.assertUniqueDisplayOrder(
      displayOrder,
      data.type,
    );

    const item = await Genre.create({
      name,
      type: data.type,
      description: data.description?.trim() ?? "",
      displayOrder,
      status: data.status ?? GenreStatus.ACTIVE,
      icon: data.icon?.trim() ?? null,
      seoTitle: data.seoTitle?.trim() ?? null,
      seoDescription: data.seoDescription?.trim() ?? null,
      createdBy: adminId ? new Types.ObjectId(adminId) : undefined,
      updatedBy: adminId ? new Types.ObjectId(adminId) : undefined,
    });

    if (adminId) {
      await AuditLog.create({
        adminId: new Types.ObjectId(adminId),
        module: AuditModule.GENRES,
        action: `Create ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`,
        entityId: item._id,
        newData: item.toObject(),
        status: AuditStatus.SUCCESS,
      }).catch(err => logger.error("Failed to create audit log for genre:", err));
    }

    await item.populate([
      { path: "createdBy", select: "fullName firstName lastName" },
      { path: "updatedBy", select: "fullName firstName lastName" }
    ]);

    return ContentCategoryService.formatItem(item, 0);
  }

  static async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      displayOrder?: number;
      status?: GenreStatus;
      icon?: string;
      seoTitle?: string;
      seoDescription?: string;
    },
    adminId?: string
  ) {
    const item = await Genre.findById(id);
    if (!item) throw new Error(ERROR_MESSAGES.NOT_FOUND);

    if (data.name !== undefined) {
      const name = data.name.trim();
      await ContentCategoryService.assertUniqueName(name, item.type, id);
      item.name = name;
    }

    if (data.description !== undefined) {
      item.description = data.description.trim();
    }

    if (data.status !== undefined) {
      item.status = data.status;
    }

    if (data.icon !== undefined) {
      item.icon = data.icon.trim();
    }
    if (data.seoTitle !== undefined) {
      item.seoTitle = data.seoTitle.trim();
    }
    if (data.seoDescription !== undefined) {
      item.seoDescription = data.seoDescription.trim();
    }

    if (adminId) {
      item.updatedBy = new Types.ObjectId(adminId);
    }

    if (
      data.displayOrder !== undefined &&
      data.displayOrder !== item.displayOrder
    ) {
      const displayOrder = Math.max(1, data.displayOrder);
      await ContentCategoryService.assertUniqueDisplayOrder(
        displayOrder,
        item.type,
        id,
      );
      item.displayOrder = displayOrder;
    }

    await item.save();

    await item.populate([
      { path: "createdBy", select: "fullName firstName lastName" },
      { path: "updatedBy", select: "fullName firstName lastName" }
    ]);

    const countMap = await ContentCategoryService.getContentCountMap([new Types.ObjectId(item._id)]);
    const contentCount = countMap.get(item._id.toString()) || 0;

    return ContentCategoryService.formatItem(item, contentCount);
  }

  static async updateStatus(id: string, status: GenreStatus) {
    return ContentCategoryService.update(id, { status });
  }

  static async updateDisplayOrder(id: string, displayOrder: number) {
    return ContentCategoryService.update(id, { displayOrder });
  }

  static async delete(id: string): Promise<void> {
    const item = await Genre.findById(id);
    if (!item) throw new Error(ERROR_MESSAGES.NOT_FOUND);

    const countMap = await ContentCategoryService.getContentCountMap([new Types.ObjectId(item._id)]);
    const mappedCount = countMap.get(item._id.toString()) || 0;
    if (mappedCount > 0) {
      throw new Error(ERROR_MESSAGES.MAPPED_TO_CONTENT);
    }

    await Genre.findByIdAndDelete(id);
    logger.info(`Content category deleted: ${id} (${item.type})`);
  }

  private static async shiftDisplayOrderOnConflict(
    type: type,
    targetOrder: number,
    excludeId?: string,
  ): Promise<void> {
    const filter: FilterQuery<IGenre> = {
      type,
      displayOrder: { $gte: targetOrder },
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const conflict = await Genre.findOne(filter);
    if (conflict) {
      await Genre.updateMany(filter, { $inc: { displayOrder: 1 } });
    }
  }
}
