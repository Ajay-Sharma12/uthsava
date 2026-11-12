import { FilterQuery } from "mongoose";

/**
 * Common field configurations for different models
 * SonarQube compliant: Centralized configuration management
 */
export const USER_SORT_FIELDS = [
  "userId",
  "email",
  "firstName",
  "lastName",
  "fullName",
  "mobile",
  "gender",
  "status",
  "createdAt",
  "updatedAt",
  "lastLoginAt",
] as const;

export const USER_SEARCH_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "fullName",
  "mobile",
] as const;

export const EMAIL_TEMPLATE_SORT_FIELDS = [
  "title",
  "subject",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const EMAIL_TEMPLATE_SEARCH_FIELDS = ["title"] as const;

export const SUBADMIN_SORT_FIELDS = [
  "email",
  "fullName",
  "firstName",
  "lastName",
  "mobile",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const SUBADMIN_SEARCH_FIELDS = [
  "email",
  "fullName",
  "firstName",
  "lastName",
  "mobile",
] as const;

export const EARNING_SORT_FIELDS = [
  "totalPrice",
  "assignedAt",
  "createdAt",
  "updatedAt",
] as const;

export const EARNING_SEARCH_FIELDS = ["fullName", "email"] as const;

/**
 * Generic query builder for consistent API filtering
 * SonarQube compliant: Reusable, type-safe, follows DRY principles
 */
export class QueryBuilder {
  /**
   * Build search query with smart field detection
   * Handles email searches, numeric searches, and text searches
   * Special handling for array fields like tags
   */
  static buildSearchQuery(
    search: string,
    searchFields: readonly string[],
  ): any {
    if (!search) {
      return {};
    }

    const fields: any[] = [];
    const isEmailSearch = search.includes("@");

    // Array fields that need special handling with $elemMatch
    const arrayFields = ["tags"];

    if (isEmailSearch) {
      // Email search: only search in email field with starts-with pattern
      const escapedSearch = search.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
      fields.push({ email: { $regex: `^${escapedSearch}`, $options: "i" } });
    } else {
      searchFields.forEach((field) => {
        if (field && search) {
          if (arrayFields.includes(field)) {
            // For array fields, use $elemMatch with regex to match array elements
            // Convert search to uppercase since tags are stored in uppercase
            const searchUpper = search.toUpperCase().replace(/\s+/g, '_');
            fields.push({
              [field]: {
                $in: [searchUpper]
              }
            });
            // Also try partial match with regex as fallback
            fields.push({
              [field]: {
                $elemMatch: {
                  $regex: search,
                  $options: "i"
                }
              }
            });
          } else {
            fields.push({ [field]: { $regex: search, $options: "i" } });
          }
        }
      });

      // Numeric search: for userId and mobile combinations
      const numericSearch = search.replaceAll(/[^\d]/g, "");
      if (numericSearch) {
        const parsedId = Number.parseInt(numericSearch);
        if (!Number.isNaN(parsedId)) {
          fields.push({ userId: parsedId });
        }

        // Combined countryCode + mobile search
        fields.push({
          $expr: {
            $regexMatch: {
              input: {
                $concat: [
                  { $toString: { $ifNull: ["$countryCode", ""] } },
                  { $toString: { $ifNull: ["$mobile", ""] } },
                ],
              },
              regex: numericSearch,
              options: "i",
            },
          },
        });
      }
    }

    return fields.length > 0 ? { $or: fields } : {};
  }

  /**
   * Build date range filter with robust UTC start-of-day and end-of-day normalization.
   * Handles string dates (YYYY-MM-DD or ISO format) and Date objects without timezone shift issues.
   * Supports matching Date objects, ISO strings, and fallback date fields.
   */
  static buildDateRangeFilter(
    startDate?: string | Date,
    endDate?: string | Date,
    fieldName: string = "createdAt",
  ): any {
    if (!startDate && !endDate) {
      return {};
    }

    let start: Date | null = null;
    if (startDate) {
      const rawStart = typeof startDate === "string" ? startDate.trim() : startDate;
      const parsed = new Date(rawStart);
      if (!Number.isNaN(parsed.getTime())) {
        start = parsed;
        if (typeof rawStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
          const [year, month, day] = rawStart.split("-").map(Number);
          start.setUTCFullYear(year, month - 1, day);
          start.setUTCHours(0, 0, 0, 0);
        } else {
          start.setUTCHours(0, 0, 0, 0);
        }
      }
    }

    let end: Date | null = null;
    if (endDate) {
      const rawEnd = typeof endDate === "string" ? endDate.trim() : endDate;
      const parsed = new Date(rawEnd);
      if (!Number.isNaN(parsed.getTime())) {
        end = parsed;
        if (typeof rawEnd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd)) {
          const [year, month, day] = rawEnd.split("-").map(Number);
          end.setUTCFullYear(year, month - 1, day);
          end.setUTCHours(23, 59, 59, 999);
        } else {
          end.setUTCHours(23, 59, 59, 999);
        }
      }
    }

    if (!start && !end) {
      return {};
    }

    const dateCond: any = {};
    const stringCond: any = {};

    if (start) {
      dateCond.$gte = start;
      stringCond.$gte = start.toISOString();
    }
    if (end) {
      dateCond.$lte = end;
      stringCond.$lte = end.toISOString();
    }

    const conditions: any[] = [
      { [fieldName]: dateCond },
      { [fieldName]: stringCond },
    ];

    if (fieldName === "createdAt") {
      conditions.push({ registrationDate: dateCond });
      conditions.push({ registrationDate: stringCond });
    }

    return { $or: conditions };
  }

  /**
   * Build status and enum filters
   */
  static buildEnumFilters(filters: Record<string, any>): FilterQuery<any> {
    const query: any = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query[key] = value;
      }
    });

    return query;
  }

  /**
   * Combine multiple query parts into a single query
   */
  static combineQueries(...queries: any[]): any {
    return queries.reduce((acc, query) => ({ ...acc, ...query }), {});
  }

  /**
   * Build complete listing query with all common filters
   */
  static buildListingQuery(params: {
    search?: string;
    searchFields: readonly string[];
    enumFilters?: Record<string, any>;
    startDate?: string;
    endDate?: string;
    dateField?: string;
  }): any {
    const {
      search,
      searchFields,
      enumFilters = {},
      startDate,
      endDate,
      dateField,
    } = params;

    const searchQuery = this.buildSearchQuery(search || "", searchFields);
    const filterQuery = this.buildEnumFilters(enumFilters);
    const dateQuery = this.buildDateRangeFilter(startDate, endDate, dateField);

    return this.combineQueries(searchQuery, filterQuery, dateQuery);
  }
}
