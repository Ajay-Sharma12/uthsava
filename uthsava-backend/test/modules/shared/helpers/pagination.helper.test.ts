import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";

describe("PaginationHelper Unit Tests", () => {
  /* =========================================================================
   * parseParams Tests
   * ========================================================================= */
  describe("parseParams", () => {
    it("[Positive] should parse pagination parameters with valid values", () => {
      const query = { page: "2", limit: "15", sortBy: "date", sortOrder: "asc" };
      const params = PaginationHelper.parseParams(query);

      expect(params.page).toBe(2);
      expect(params.limit).toBe(15);
      expect(params.sortBy).toBe("createdAt"); // mapped from 'date'
      expect(params.sortOrder).toBe("asc");
    });

    it("[Positive] should default if query params are completely missing", () => {
      const params = PaginationHelper.parseParams({});

      expect(params.page).toBe(1);
      expect(params.limit).toBe(10);
      expect(params.sortBy).toBe("createdAt");
      expect(params.sortOrder).toBe("desc");
    });

    it("[Negative] should fallback to default limit and page if invalid numbers are passed", () => {
      const query = { page: "-5", limit: "invalid-number" };
      const params = PaginationHelper.parseParams(query);

      expect(params.page).toBe(1); // falls back to Math.max(1, NaN || 1) = 1
      expect(params.limit).toBe(10);
    });

    it("[Validation] should restrict maximum limit to 100", () => {
      const query = { limit: "250" };
      const params = PaginationHelper.parseParams(query);

      expect(params.limit).toBe(100);
    });

    it("[Validation] should reset sortBy to createdAt if not allowed", () => {
      const query = { sortBy: "password" };
      const params = PaginationHelper.parseParams(query, ["name", "email"]);

      expect(params.sortBy).toBe("createdAt");
    });
  });

  /* =========================================================================
   * paginate Query Execution Tests
   * ========================================================================= */
  describe("paginate", () => {
    let mockModel: any;
    let mockExec: jest.Mock;
    let mockCountDocuments: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();

      mockExec = jest.fn();
      mockCountDocuments = jest.fn();

      mockModel = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: mockExec,
        countDocuments: mockCountDocuments,
      };
    });

    it("[Positive] should successfully execute pagination and return standard response payload", async () => {
      const doc1 = { toJSON: () => ({ name: "Item 1" }) };
      const doc2 = { toJSON: () => ({ name: "Item 2" }) };
      mockExec.mockResolvedValue([doc1, doc2]);
      mockCountDocuments.mockResolvedValue(25);

      const params = { page: 2, limit: 10, sortBy: "createdAt", sortOrder: "desc" as const };
      const result = await PaginationHelper.paginate(mockModel as any, { active: true }, params);

      expect(mockModel.find).toHaveBeenCalledWith({ active: true });
      expect(mockModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockModel.skip).toHaveBeenCalledWith(10);
      expect(mockModel.limit).toHaveBeenCalledWith(10);
      expect(mockExec).toHaveBeenCalled();
      expect(mockCountDocuments).toHaveBeenCalledWith({ active: true });

      expect(result).toEqual({
        data: [{ name: "Item 1" }, { name: "Item 2" }],
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalCount: 25,
          limit: 10,
          hasNextPage: true,
          hasPrevPage: true,
        },
      });
    });

    it("[Positive] should support populate options and query filters", async () => {
      mockExec.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);

      const params = { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" as const };
      await PaginationHelper.paginate(mockModel as any, {}, params, "name email", "user");

      expect(mockModel.select).toHaveBeenCalledWith("name email");
      expect(mockModel.populate).toHaveBeenCalledWith("user");
    });
  });

  /* =========================================================================
   * buildSearchQuery & buildFilterQuery Tests
   * ========================================================================= */
  describe("query builders", () => {
    it("[Positive] should build valid search regex query", () => {
      const query = PaginationHelper.buildSearchQuery("search", ["name", "email"]);
      expect(query).toEqual({
        $or: [
          { name: { $regex: "search", $options: "i" } },
          { email: { $regex: "search", $options: "i" } },
        ],
      });
    });

    it("[Edge] should return empty object for empty search query params", () => {
      expect(PaginationHelper.buildSearchQuery("", ["name"])).toEqual({});
      expect(PaginationHelper.buildSearchQuery("search", [])).toEqual({});
    });

    it("[Positive] should build filter query skipping empty or null values", () => {
      const filters = {
        active: true,
        category: "action",
        nullField: null,
        emptyString: "",
        undefinedField: undefined,
      };

      const query = PaginationHelper.buildFilterQuery(filters);
      expect(query).toEqual({
        active: true,
        category: "action",
      });
    });
  });
});
