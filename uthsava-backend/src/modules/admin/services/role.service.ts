import { RoleModel, IRole } from "../../../models/role.model";
import { User, SubAdmin } from "../../../models";
import { PaginationParams, PaginationHelper } from "../../shared/helpers/pagination.helper";
import { FilterQuery } from "mongoose";
import { mergeRoleAndCustomPermissions } from "../helpers/permission-merge.helper";
import { sanitizeSubAdminPermissions } from "../helpers/subadmin-permissions.helper";

export class RoleService {
  /**
   * Create a new role
   */
  static async createRole(data: Partial<IRole>): Promise<IRole> {
    const existing = await RoleModel.findOne({ name: data.name });
    if (existing) {
      throw new Error("role.name_exists");
    }
    if (data.permissions) {
      data.permissions = sanitizeSubAdminPermissions(data.permissions as any) as any;
    }
    return RoleModel.create(data);
  }

  /**
   * Update an existing role by ID
   */
  static async updateRole(
    id: string,
    data: Partial<IRole>,
  ): Promise<IRole | null> {
    const role = await RoleModel.findById(id);
    if (!role) {
      throw new Error("role.not_found");
    }

    if (data.name && data.name !== role.name) {
      const existing = await RoleModel.findOne({ name: data.name });
      if (existing) {
        throw new Error("role.name_exists");
      }
      role.name = data.name;
    }

    if (data.description !== undefined) {
      role.description = data.description;
    }

    if (data.status !== undefined) {
      role.status = data.status;
    }

    let permissionsUpdated = false;
    if (data.permissions) {
      role.permissions = sanitizeSubAdminPermissions(data.permissions as any) as any;
      permissionsUpdated = true;
    }

    await role.save();

    // Synchronization Logic
    // Whenever a Role is updated, find every SubAdmin using this Role and sync permissions.
    if (permissionsUpdated) {
      const subAdmins = await SubAdmin.find({ roleId: role._id });
      
      const bulkOps = subAdmins.map((subAdmin) => {
        const mergedPermissions = mergeRoleAndCustomPermissions(
          role.permissions,
          (subAdmin as any).customPermissions
        );
        return {
          updateOne: {
            filter: { _id: subAdmin._id },
            update: {
              $set: {
                permissions: mergedPermissions,
                isActionRequired: true,
              },
            },
          },
        };
      });

      if (bulkOps.length > 0) {
        await SubAdmin.bulkWrite(bulkOps as any);
      }
    }

    return role;
  }

  /**
   * Get role by ID
   */
  static async getRoleById(id: string): Promise<IRole | null> {
    return RoleModel.findById(id);
  }

  /**
   * List roles with pagination
   */
  static async listRoles(
    pagination: PaginationParams,
    query: FilterQuery<IRole> = {},
  ) {
    const parsedParams = PaginationHelper.parseParams(pagination, ["name", "createdAt", "updatedAt"]);
    return PaginationHelper.paginate(RoleModel, query, parsedParams);
  }

  /**
   * Delete role
   */
  static async deleteRole(id: string): Promise<void> {
    // Check if role is assigned to any subadmin
    const count = await User.countDocuments({ roleId: id, role: "admin_sub_user" });
    if (count > 0) {
      throw new Error("role.in_use");
    }

    const result = await RoleModel.findByIdAndDelete(id);
    if (!result) {
      throw new Error("role.not_found");
    }
  }
}
