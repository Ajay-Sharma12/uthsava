import { sanitizeSubAdminPermissions, ALLOWED_SUBADMIN_PERMISSION_MODULES } from "../../../../src/modules/admin/helpers/subadmin-permissions.helper";

describe("SubAdmin Permissions Helper", () => {
  describe("sanitizeSubAdminPermissions", () => {
    it("should return empty defaults for missing input", () => {
      const result = sanitizeSubAdminPermissions(null);
      expect(Object.keys(result).length).toBe(ALLOWED_SUBADMIN_PERMISSION_MODULES.length);
      expect(result.users.view).toBe(false);
      expect(result.users.all).toBe(false);
    });

    it("should process standard object", () => {
      const raw = {
        users: { view: true, create: false, all: false },
        dashboard: { all: true }
      };
      const result = sanitizeSubAdminPermissions(raw);
      
      expect(result.users.view).toBe(true);
      expect(result.users.create).toBe(false);
      expect(result.users.all).toBe(false);

      expect(result.dashboard.all).toBe(true);
      expect(result.dashboard.view).toBe(true);
      expect(result.dashboard.create).toBe(true);
    });

    it("should process Map object", () => {
      const rawMap = new Map();
      rawMap.set("users", { view: true });
      rawMap.set("dashboard", { all: true });
      
      const result = sanitizeSubAdminPermissions(rawMap);
      
      expect(result.users.view).toBe(true);
      expect(result.users.all).toBe(false);

      expect(result.dashboard.all).toBe(true);
      expect(result.dashboard.view).toBe(true);
    });

    it("should process mongoose Document-like object (with toObject)", () => {
      const doc = {
        toObject: () => ({
          users: { view: true }
        })
      };
      
      const result = sanitizeSubAdminPermissions(doc as any);
      expect(result.users.view).toBe(true);
      expect(result.dashboard.view).toBe(false);
    });

    it("should fallback to entries if available", () => {
      const entriesObj = {
        entries: () => [["users", { view: true }]]
      };
      
      const result = sanitizeSubAdminPermissions(entriesObj as any);
      expect(result.users.view).toBe(true);
      expect(result.dashboard.view).toBe(false);
    });
  });
});
