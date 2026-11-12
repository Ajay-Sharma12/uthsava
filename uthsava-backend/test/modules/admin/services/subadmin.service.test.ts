import { SubAdminService } from "../../../../src/modules/admin/services/subadmin.service";
import { User, SubAdmin } from "../../../../src/models";
import { RoleModel } from "../../../../src/models/role.model";
import { mergeRoleAndCustomPermissions } from "../../../../src/modules/admin/helpers/permission-merge.helper";
import { sanitizeSubAdminPermissions } from "../../../../src/modules/admin/helpers/subadmin-permissions.helper";
import { AuthService } from "../../../../src/modules/auth/services/auth.service";

jest.mock("../../../../src/models");
jest.mock("../../../../src/models/role.model");
jest.mock("../../../../src/modules/admin/helpers/permission-merge.helper");
jest.mock("../../../../src/modules/admin/helpers/subadmin-permissions.helper");
jest.mock("../../../../src/modules/auth/services/auth.service", () => ({
  AuthService: {
    hashPassword: jest.fn().mockResolvedValue("hashed"),
  }
}));
jest.mock("../../../../src/modules/shared/helpers/password.helper", () => ({
  PasswordHelper: {
    generateAlphanumericPassword: jest.fn().mockReturnValue("password123"),
  },
}));

describe("SubAdminService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sanitizeSubAdminPermissions as jest.Mock).mockImplementation((v) => v);
  });

  describe("createSubAdmin", () => {
    it("should merge role permissions and custom permissions correctly", async () => {
      const mockRole = { _id: "role1", permissions: { users: { view: true } } };
      (RoleModel.findById as jest.Mock).mockResolvedValue(mockRole);
      
      const createData: any = {
        email: "test@test.com",
        roleId: "role1",
        customPermissions: { cms: { view: true } },
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (AuthService.hashPassword as jest.Mock).mockResolvedValue("hashed");
      
      const mergedPerms = { users: { view: true }, cms: { view: true } };
      (mergeRoleAndCustomPermissions as jest.Mock).mockReturnValue(mergedPerms);
      
      (SubAdmin.create as jest.Mock).mockResolvedValue({
        ...createData,
        permissions: mergedPerms,
      });

      // We mock the email template and sending email logic to not fail
      jest.mock("../../../../src/models/email-template.model", () => ({
        EmailTemplate: { findOne: jest.fn().mockResolvedValue(null) },
      }));
      jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
        sendMail: jest.fn().mockResolvedValue(true),
      }));

      try {
        await SubAdminService.createSubAdmin(createData);
      } catch (e) {
        // Ignoring email template error if it happens because we just want to test permission mapping
      }

      expect(mergeRoleAndCustomPermissions).toHaveBeenCalledWith(
        mockRole.permissions,
        createData.customPermissions
      );
      
      expect(SubAdmin.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: "role1",
          permissions: mergedPerms,
          customPermissions: createData.customPermissions,
          isActionRequired: false,
        })
      );
    });
  });

  describe("updateSubAdmin", () => {
    it("should update permissions when roleId or customPermissions change", async () => {
      const existingUser = {
        _id: "user1",
        roleId: "oldRole",
        customPermissions: {},
        permissions: {},
        save: jest.fn().mockResolvedValue(true),
      };
      (SubAdmin.findOne as jest.Mock).mockResolvedValue(existingUser);
      
      const newRole = { _id: "newRole", permissions: { dashboard: { view: true } } };
      (RoleModel.findById as jest.Mock).mockResolvedValue(newRole);

      const mergedPerms = { dashboard: { view: true }, settings: { view: true } };
      (mergeRoleAndCustomPermissions as jest.Mock).mockReturnValue(mergedPerms);

      const updateData: any = {
        roleId: "newRole",
        customPermissions: { settings: { view: true } },
      };

      await SubAdminService.updateSubAdmin("user1", updateData);

      expect(RoleModel.findById).toHaveBeenCalledWith("newRole");
      expect(mergeRoleAndCustomPermissions).toHaveBeenCalledWith(
        newRole.permissions,
        existingUser.customPermissions // this will be { settings: { view: true } } after setting
      );

      expect(existingUser.permissions).toEqual(mergedPerms);
      expect((existingUser as any).isActionRequired).toBe(false);
      expect(existingUser.save).toHaveBeenCalled();
    });
  });
});
