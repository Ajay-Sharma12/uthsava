import { mergeRoleAndCustomPermissions } from "../../../../src/modules/admin/helpers/permission-merge.helper";
import { sanitizeSubAdminPermissions } from "../../../../src/modules/admin/helpers/subadmin-permissions.helper";

jest.mock("../../../../src/modules/admin/helpers/subadmin-permissions.helper");

describe("mergeRoleAndCustomPermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should merge role and custom permissions additively", () => {
    const rolePermissions = {
      users: { view: true, create: false, edit: false, delete: false, all: false },
    };
    
    const customPermissions = {
      users: { view: false, create: true, edit: false, delete: false, all: false },
      cms_pages: { view: true, create: false, edit: false, delete: false, all: false },
    };

    (sanitizeSubAdminPermissions as jest.Mock)
      .mockReturnValueOnce(rolePermissions) // first call is for rolePermissions
      .mockReturnValueOnce(customPermissions); // second call is for customPermissions

    const merged = mergeRoleAndCustomPermissions(rolePermissions, customPermissions);

    expect(merged.users).toEqual({
      view: true, // from role
      create: true, // from custom
      edit: false,
      delete: false,
      all: false,
      approve: false,
    });

    expect(merged.cms_pages).toEqual({
      view: true, // from custom
      create: false,
      edit: false,
      delete: false,
      all: false,
      approve: false,
    });

    expect(sanitizeSubAdminPermissions).toHaveBeenCalledTimes(2);
  });
});
