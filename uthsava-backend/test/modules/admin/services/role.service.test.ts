import { RoleService } from "../../../../src/modules/admin/services/role.service";
import { RoleModel } from "../../../../src/models/role.model";
import { User, SubAdmin } from "../../../../src/models";
import { mergeRoleAndCustomPermissions } from "../../../../src/modules/admin/helpers/permission-merge.helper";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";

jest.mock("../../../../src/models/role.model");
jest.mock("../../../../src/models", () => ({
  User: {
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
  SubAdmin: {
    find: jest.fn(),
    bulkWrite: jest.fn(),
  },
}));
jest.mock("../../../../src/modules/admin/helpers/permission-merge.helper");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");

describe("RoleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createRole", () => {
    it("should create a new role", async () => {
      const roleData = { name: "Test Role" };
      (RoleModel.findOne as jest.Mock).mockResolvedValue(null);
      (RoleModel.create as jest.Mock).mockResolvedValue({ _id: "1", ...roleData });

      const result = await RoleService.createRole(roleData);

      expect(RoleModel.findOne).toHaveBeenCalledWith({ name: "Test Role" });
      expect(RoleModel.create).toHaveBeenCalledWith(roleData);
      expect(result).toEqual({ _id: "1", ...roleData });
    });

    it("should throw error if role name exists", async () => {
      const roleData = { name: "Test Role" };
      (RoleModel.findOne as jest.Mock).mockResolvedValue({ _id: "1", ...roleData });

      await expect(RoleService.createRole(roleData)).rejects.toThrow("role.name_exists");
    });
  });

  describe("updateRole", () => {
    it("should throw error if role not found", async () => {
      (RoleModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(RoleService.updateRole("1", { name: "Updated" })).rejects.toThrow("role.not_found");
    });

    it("should update role without syncing if permissions not changed", async () => {
      const mockRole = {
        _id: "1",
        name: "Old Role",
        description: "Old Desc",
        permissions: {},
        save: jest.fn().mockResolvedValue(true),
      };
      (RoleModel.findById as jest.Mock).mockResolvedValue(mockRole);
      (RoleModel.findOne as jest.Mock).mockResolvedValue(null);

      const updateData = { name: "New Role", description: "New Desc" };
      const result = await RoleService.updateRole("1", updateData);

      expect(mockRole.name).toBe("New Role");
      expect(mockRole.description).toBe("New Desc");
      expect(mockRole.save).toHaveBeenCalled();
      expect(SubAdmin.find).not.toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });

    it("should update role and sync permissions if permissions changed", async () => {
      const mockRole = {
        _id: "1",
        name: "Old Role",
        permissions: {},
        save: jest.fn().mockResolvedValue(true),
      };
      (RoleModel.findById as jest.Mock).mockResolvedValue(mockRole);

      const mockSubAdmin = {
        _id: "user1",
        customPermissions: {},
        permissions: {},
        isActionRequired: false,
      };
      (SubAdmin.find as jest.Mock).mockResolvedValue([mockSubAdmin]);
      (SubAdmin.bulkWrite as jest.Mock).mockResolvedValue(true);

      const mockMergedPermissions = { users: { view: true } };
      (mergeRoleAndCustomPermissions as jest.Mock).mockReturnValue(mockMergedPermissions);

      const updateData = { permissions: { users: { view: true } } as any };
      await RoleService.updateRole("1", updateData);

      expect(mockRole.permissions).toEqual(updateData.permissions);
      expect(SubAdmin.find).toHaveBeenCalledWith({ roleId: "1" });
      expect(mergeRoleAndCustomPermissions).toHaveBeenCalledWith(updateData.permissions, mockSubAdmin.customPermissions);
      expect(SubAdmin.bulkWrite).toHaveBeenCalled();
    });
  });

  describe("getRoleById", () => {
    it("should return role by id", async () => {
      const mockRole = { _id: "1", name: "Test" };
      (RoleModel.findById as jest.Mock).mockResolvedValue(mockRole);

      const result = await RoleService.getRoleById("1");

      expect(RoleModel.findById).toHaveBeenCalledWith("1");
      expect(result).toEqual(mockRole);
    });
  });

  describe("listRoles", () => {
    it("should paginate roles", async () => {
      const mockPagination = { page: 1, limit: 10 };
      const mockParsedParams = { page: 1, limit: 10 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockParsedParams);
      
      const mockResult = { data: [], pagination: {} };
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue(mockResult);

      const result = await RoleService.listRoles(mockPagination, {});

      expect(PaginationHelper.parseParams).toHaveBeenCalled();
      expect(PaginationHelper.paginate).toHaveBeenCalledWith(RoleModel, {}, mockParsedParams);
      expect(result).toEqual(mockResult);
    });
  });

  describe("deleteRole", () => {
    it("should throw error if role is in use", async () => {
      (User.countDocuments as jest.Mock).mockResolvedValue(1);

      await expect(RoleService.deleteRole("1")).rejects.toThrow("role.in_use");
    });

    it("should delete role if not in use", async () => {
      (User.countDocuments as jest.Mock).mockResolvedValue(0);
      (RoleModel.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: "1" });

      await RoleService.deleteRole("1");

      expect(RoleModel.findByIdAndDelete).toHaveBeenCalledWith("1");
    });

    it("should throw error if role not found during deletion", async () => {
      (User.countDocuments as jest.Mock).mockResolvedValue(0);
      (RoleModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(RoleService.deleteRole("1")).rejects.toThrow("role.not_found");
    });
  });
});
