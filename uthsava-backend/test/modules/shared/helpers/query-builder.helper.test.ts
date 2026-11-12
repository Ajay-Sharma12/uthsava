import { QueryBuilder } from "../../../../src/modules/shared/helpers/query-builder.helper";

describe("QueryBuilder Unit Tests", () => {
  /* =========================================================================
   * buildSearchQuery TESTS
   * ========================================================================= */
  describe("buildSearchQuery", () => {
    it("[Positive] should build correct search query for normal text fields", () => {
      const search = "John";
      const searchFields = ["firstName", "lastName"];
      const query = QueryBuilder.buildSearchQuery(search, searchFields);

      expect(query).toEqual({
        $or: [
          { firstName: { $regex: "John", $options: "i" } },
          { lastName: { $regex: "John", $options: "i" } },
        ],
      });
    });

    it("[Positive] should handle email searches with prefix matching and escaping regex characters", () => {
      const search = "john.doe+1@test.com";
      const query = QueryBuilder.buildSearchQuery(search, ["email"]);

      expect(query).toEqual({
        $or: [
          { email: { $regex: "^john\\.doe\\+1@test\\.com", $options: "i" } },
        ],
      });
    });

    it("[Positive] should handle array fields like tags in search fields", () => {
      const search = "action movie";
      const query = QueryBuilder.buildSearchQuery(search, ["tags"]);

      expect(query.$or).toContainEqual({
        tags: { $in: ["ACTION_MOVIE"] },
      });
      expect(query.$or).toContainEqual({
        tags: { $elemMatch: { $regex: "action movie", $options: "i" } },
      });
    });

    it("[Positive] should support combined mobile and countryCode matching if numeric inputs are parsed", () => {
      const search = "+1-123456";
      const query = QueryBuilder.buildSearchQuery(search, ["mobile"]);

      // It extracts digits: "1123456"
      expect(query.$or).toContainEqual({
        userId: 1123456,
      });
      expect(query.$or).toContainEqual(
        expect.objectContaining({
          $expr: expect.any(Object),
        })
      );
    });

    it("[Negative] should return an empty object if search term is empty or missing", () => {
      expect(QueryBuilder.buildSearchQuery("", ["name"])).toEqual({});
    });
  });

  /* =========================================================================
   * buildDateRangeFilter TESTS
   * ========================================================================= */
  describe("buildDateRangeFilter", () => {
    it("[Positive] should correctly normalize and build date filters for YYYY-MM-DD strings", () => {
      const query = QueryBuilder.buildDateRangeFilter("2026-05-15", "2026-05-16");

      expect(query.$or).toBeDefined();
      // Start date set to UTC start of day: 2026-05-15T00:00:00.000Z
      const startCondition = query.$or[0].createdAt;
      expect(startCondition.$gte).toBeInstanceOf(Date);
      expect(startCondition.$gte.getUTCFullYear()).toBe(2026);
      expect(startCondition.$gte.getUTCMonth()).toBe(4); // 0-indexed May
      expect(startCondition.$gte.getUTCDate()).toBe(15);
      expect(startCondition.$gte.getUTCHours()).toBe(0);

      // End date set to UTC end of day: 2026-05-16T23:59:59.999Z
      expect(startCondition.$lte.getUTCDate()).toBe(16);
      expect(startCondition.$lte.getUTCHours()).toBe(23);
      expect(startCondition.$lte.getUTCMinutes()).toBe(59);
    });

    it("[Positive] should support Date objects for range filter", () => {
      const start = new Date("2026-06-01T10:00:00Z");
      const end = new Date("2026-06-02T15:00:00Z");
      const query = QueryBuilder.buildDateRangeFilter(start, end, "customDate");

      expect(query.$or[0].customDate.$gte.getUTCDate()).toBe(1);
      expect(query.$or[0].customDate.$gte.getUTCHours()).toBe(0);
      expect(query.$or[0].customDate.$lte.getUTCDate()).toBe(2);
      expect(query.$or[0].customDate.$lte.getUTCHours()).toBe(23);
    });

    it("[Negative] should return empty object if both bounds are missing", () => {
      expect(QueryBuilder.buildDateRangeFilter()).toEqual({});
    });

    it("[Edge] should return empty object if date strings are invalid and unparseable", () => {
      expect(QueryBuilder.buildDateRangeFilter("invalid-date", "another-invalid")).toEqual({});
    });
  });

  /* =========================================================================
   * COMBINED LISTING QUERY TESTS
   * ========================================================================= */
  describe("buildListingQuery", () => {
    it("[Positive] should successfully combine search, enum filters, and date ranges", () => {
      const params = {
        search: "Moderator",
        searchFields: ["role"] as const,
        enumFilters: { status: "active", verified: true },
        startDate: "2026-01-01",
        endDate: "2026-01-02",
        dateField: "createdAt",
      };

      const query = QueryBuilder.buildListingQuery(params);

      // Verify search merged
      expect(query.$or).toBeDefined();
      // Verify enum filters merged
      expect(query.status).toBe("active");
      expect(query.verified).toBe(true);
    });
  });
});
