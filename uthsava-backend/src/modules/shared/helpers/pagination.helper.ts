import { Model, FilterQuery, PopulateOptions } from "mongoose";

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Generic pagination utility for consistent pagination across all listing APIs
 * SonarQube compliant: Type-safe, reusable, and follows DRY principles
 */
export class PaginationHelper {
  /**
   * Parse and validate pagination parameters from request query
   */
  static parseParams(
    query: any,
    allowedSortFields?: string[],
  ): Required<PaginationParams> {
    const page = Math.max(1, Number.parseInt(query.page as string) || 1);
    const limit = Math.min(
      1000,
      Math.max(1, Number.parseInt(query.limit as string) || 100),
    ); // Default 100, max 1000 items per page

    let sortBy = (query.sortBy as string) || "createdAt";
    const sortOrder = (query.sortOrder as string) === "asc" ? "asc" : "desc";

    // Map common aliases to actual field names
    const sortFieldMap: Record<string, string> = {
      name: "fullName",
      userName: "fullName",
      user: "fullName",
      date: "createdAt",
      created: "createdAt",
      updated: "updatedAt",
      id: "userId",
    };

    // Apply mapping if exists, but only if the original sortBy is not allowed OR the mapped field is allowed.
    if (sortFieldMap[sortBy]) {
      const mapped = sortFieldMap[sortBy];
      if (!allowedSortFields || allowedSortFields.includes(mapped) || !allowedSortFields.includes(sortBy)) {
        sortBy = mapped;
      }
    }

    // Validate against allowed fields if provided
    if (allowedSortFields && !allowedSortFields.includes(sortBy)) {
      sortBy = "createdAt"; // Default to createdAt if invalid
    }

    return { page, limit, sortBy, sortOrder };
  }

  /**
   * Execute paginated query with consistent structure
   */
  static async paginate<T>(
    model: Model<T>,
    query: FilterQuery<T>,
    params: Required<PaginationParams>,
    selectFields?: string,
    populateFields?: string | string[] | PopulateOptions | PopulateOptions[],
  ): Promise<PaginatedResponse<T>> {
    const { page, limit, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Build base query
    let findQuery = model
      .find(query)
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit);

    // Apply field selection if provided
    if (selectFields) {
      findQuery = findQuery.select(selectFields);
    }

    // Apply population if provided
    if (populateFields) {
      if (Array.isArray(populateFields)) {
        populateFields.forEach((field) => {
          findQuery = findQuery.populate(field as PopulateOptions);
        });
      } else {
        findQuery = findQuery.populate(populateFields as PopulateOptions);
      }
    }

    // Execute query and count in parallel for better performance
    const [data, totalCount] = await Promise.all([
      findQuery.exec(),
      model.countDocuments(query),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Convert Mongoose documents to JSON to apply toJSON transforms (e.g., profileImageUrl)
    const jsonData = data.map((doc) => doc.toJSON());

    return {
      data: jsonData as T[],
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  /**
   * Build search query for text fields
   */
  static buildSearchQuery(searchTerm: string, fields: string[]): any {
    if (!searchTerm || !fields.length) {
      return {};
    }

    return {
      $or: fields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      })),
    };
  }

  /**
   * Calculate standard pagination metadata object
   */
  static buildPaginationMeta(total: number, page: number, limit: number) {
    const currentPage = Math.max(1, Number(page) || 1);
    const currentLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const totalPages = Math.ceil(total / currentLimit) || 0;

    return {
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }

  /**
   * Build filter query from request parameters
   */
  static buildFilterQuery(filters: Record<string, any>): FilterQuery<any> {
    const query: any = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query[key] = value;
      }
    });

    return query;
  }
}
