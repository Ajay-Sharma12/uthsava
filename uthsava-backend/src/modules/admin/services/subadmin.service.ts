import { Request } from "express";
import { FilterQuery } from "mongoose";
import { getAdminBaseUrl } from "../../shared/helpers/url.helper";
import { SubAdminActivity, User, IUser, UserStatus, SubAdmin, ISubAdmin } from "../../../models";
import { Role } from "../../../common/types/auth.types";
import {
  PaginationParams,
  PaginationHelper,
} from "../../shared/helpers/pagination.helper";
import { logger } from "../../../core/constants/logger";
import { SUBADMIN_SORT_FIELDS } from "../../shared/helpers/query-builder.helper";
import { RoleHelper } from "../../shared/helpers/role.helper";
import { EmailTemplate } from "../../../models/email-template.model";
import { sendMail } from "../../shared/services/mail.service";
import { PasswordHelper } from "../../shared/helpers/password.helper";
import { AuthService } from "../../auth/services/auth.service";
import { sanitizeSubAdminPermissions } from "../helpers/subadmin-permissions.helper";
import { mergeRoleAndCustomPermissions } from "../helpers/permission-merge.helper";
import { RoleModel } from "../../../models/role.model";
import { config } from "../../../core/config";

const SUBADMIN_MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  sub_admins: "Sub Admins",
  cms_pages: "CMS Pages",
  faqs: "FAQs",
  email_templates: "Email Templates",
  settings: "Settings",
  notifications: "Notifications",
  utils: "Utilities",
  producers: "Producers",
  categories: "Categories",
};

// Error messages
export const ERROR_MESSAGES = {
  SUBADMIN_NOT_FOUND: "subadmin.not_found",
  INVALID_SUBADMIN_ID: "subadmin.invalid_id",
  EMAIL_EXISTS: "auth.email_exists",
  MOBILE_EXISTS: "auth.mobile_exists",
} as const;

/**
 * SubAdmin Service
 * Handles business logic for subadmin management
 */
export class SubAdminService {
  /**
   * List subadmins
   */
  static async listSubAdmins(
    pagination: PaginationParams,
    query: FilterQuery<IUser> = {},
  ): Promise<{
    data: IUser[];
    pagination: any;
    counts: {
      totalSubAdmins: number;
      activeSubAdmins: number;
      inactiveSubAdmins: number;
      deletedSubAdmins: number;
    };
  }> {
    try {
      // Force role to ADMIN_SUB_USER and hide removed sub-admins unless explicitly requested.
      const subAdminQuery: FilterQuery<IUser> = {
        ...query,
        role: Role.ADMIN_SUB_USER,
      };
      if (!subAdminQuery.status) {
        subAdminQuery.status = { $ne: UserStatus.DELETED } as any;
      }

      const parsedParams = PaginationHelper.parseParams(pagination, [
        ...SUBADMIN_SORT_FIELDS,
      ]);

      const result = await PaginationHelper.paginate(
        User,
        subAdminQuery,
        parsedParams,
        undefined,
        [
          { path: "roleId", select: "name" },
        ],
      );

      // Counts specifically for subadmins (applying the same query filters)
      const [
        totalSubAdmins,
        activeSubAdmins,
        inactiveSubAdmins,
        deletedSubAdmins,
      ] = await Promise.all([
        User.countDocuments({ ...subAdminQuery }),
        User.countDocuments({
          ...subAdminQuery,
          status: UserStatus.ACTIVE,
        }),
        User.countDocuments({
          ...subAdminQuery,
          status: UserStatus.INACTIVE,
        }),
        User.countDocuments({
          ...subAdminQuery,
          status: UserStatus.DELETED,
        }),
      ]);

      return {
        data: result.data,
        pagination: result.pagination,
        counts: {
          totalSubAdmins,
          activeSubAdmins,
          inactiveSubAdmins,
          deletedSubAdmins,
        },
      };
    } catch (error: any) {
      logger.error("List subadmins error:", error);
      throw error;
    }
  }

  /**
   * Get subadmin by ID
   */
  static async getSubAdminById(id: string): Promise<any | null> {
    try {
      const subAdmin = await User.findOne({
        _id: id,
        role: Role.ADMIN_SUB_USER,
      }).populate('roleId');

      return subAdmin;
    } catch (error: any) {
      logger.error("Get subadmin by ID error:", error);
      throw error;
    }
  }

  /**
   * Create subadmin
   */
  static async createSubAdmin(
    data: Partial<ISubAdmin & IUser>,
    req?: Request,
  ): Promise<{ subAdmin: ISubAdmin; temporaryPassword: string }> {
    try {
      const email = (data.email || "").toLowerCase().trim();
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        if (existingUser.status !== UserStatus.DELETED) {
          const formattedRole = RoleHelper.formatRole(existingUser.role);

          const error = new Error(ERROR_MESSAGES.EMAIL_EXISTS);
          (error as any).role = formattedRole;

          throw error;
        }

        // Clean up previously soft-deleted record so the email can be reused fresh
        await User.deleteOne({ _id: existingUser._id });
      }

      if (data.mobile && data.countryCode !== undefined) {
        const existingMobileUser = await User.findOne({
          countryCode: Number(data.countryCode),
          mobile: data.mobile,
        });

        if (existingMobileUser) {
          if (existingMobileUser.status !== UserStatus.DELETED) {
            const formattedRole = RoleHelper.formatRole(existingMobileUser.role);

            const error = new Error(ERROR_MESSAGES.MOBILE_EXISTS);
            (error as any).role = formattedRole;

            throw error;
          }

          // Clean up previously soft-deleted mobile record
          await User.deleteOne({ _id: existingMobileUser._id });
        }
      }

      // Generate password
      const temporaryPassword = PasswordHelper.generateAlphanumericPassword(8);

      // Hash password
      const hashedPassword = await AuthService.hashPassword(temporaryPassword);

      const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();

      // Normalize custom permissions payload if it arrives as JSON string
      let incomingPermissions = data.customPermissions || (data as any).subAdminPermissions;
      if (typeof incomingPermissions === "string") {
        try {
          incomingPermissions = JSON.parse(incomingPermissions);
        } catch {
          incomingPermissions = undefined;
        }
      }

      // Fetch role to get base permissions
      const role = await RoleModel.findById((data as any).roleId);
      if (!role) {
        throw new Error("role.not_found");
      }

      const customPerms = sanitizeSubAdminPermissions(incomingPermissions as any);
      const mergedPerms = mergeRoleAndCustomPermissions(role.permissions, customPerms);

      // Create subadmin
      const newSubAdmin = (await SubAdmin.create({
        ...data,
        location: (data as any).address || data.location,
        fullName,
        password: hashedPassword,
        role: Role.ADMIN_SUB_USER,

        // IMPORTANT
        roleId: (data as any).roleId,
        permissions: mergedPerms,
        customPermissions: customPerms,
        isActionRequired: false,
      })) as any;

      // Dynamic Login URL resolution based on request domain
      const adminBaseUrl = getAdminBaseUrl(req);
      const loginUrl = adminBaseUrl;

      const permissionsMap = sanitizeSubAdminPermissions(newSubAdmin.permissions as any);
      const permissionAccess =
        Object.entries(permissionsMap)
          .filter(([, permission]) =>
            Boolean(
              permission?.all ||
              permission?.view ||
              permission?.create ||
              permission?.edit ||
              permission?.delete,
            ),
          )
          .map(([module]) => SUBADMIN_MODULE_LABELS[module] || module)
          .join(", ") || "No assigned admin access.";

      // Send welcome email
      EmailTemplate.findOne({
        keyword: { $in: ["NEW_ACCOUNT_SUBADMIN", "WELCOME_SUBADMIN", "SUBADMIN_WELCOME", "NEW_SUBADMIN"] },
        status: "active",
      })
        .then((emailTemplate) => {
          const subAdminName = `${newSubAdmin.firstName || ""} ${newSubAdmin.lastName || ""}`.trim() || "Sub-Admin";
          const roleDisplayName = role?.name || "Sub-Admin";

          if (emailTemplate && emailTemplate.description) {
            let htmlContent = emailTemplate.description;

            let emailSubject = emailTemplate.subject || "Welcome to Uthsava Admin - Your Credentials";
            emailSubject = emailSubject
              .replaceAll("{{Platform Name}}", "Uthsava")
              .replaceAll("{{platformName}}", "Uthsava")
              .replaceAll("{{Platform_Name}}", "Uthsava")
              .replaceAll("{{site_name}}", "Uthsava Admin")
              .replaceAll("{{siteName}}", "Uthsava Admin")
              .replaceAll("{{User Name}}", subAdminName)
              .replaceAll("{{userName}}", subAdminName)
              .replaceAll("{{name}}", subAdminName);

            htmlContent = htmlContent
              .replaceAll("{{name}}", subAdminName)
              .replaceAll("{{Name}}", subAdminName)
              .replaceAll("{{userName}}", subAdminName)
              .replaceAll("{{User Name}}", subAdminName)
              .replaceAll("{{firstName}}", newSubAdmin.firstName || subAdminName)
              .replaceAll("{{first_name}}", newSubAdmin.firstName || subAdminName)
              .replaceAll("{{email}}", newSubAdmin.email)
              .replaceAll("{{Email}}", newSubAdmin.email)
              .replaceAll("{{userEmail}}", newSubAdmin.email)
              .replaceAll("{{password}}", temporaryPassword)
              .replaceAll("{{Password}}", temporaryPassword)
              .replaceAll("{{temporaryPassword}}", temporaryPassword)
              .replaceAll("{{temporary_password}}", temporaryPassword)
              .replaceAll("{{Auto-generated Password}}", temporaryPassword)
              .replaceAll("{{auto_generated_password}}", temporaryPassword)
              .replaceAll("{{login_url}}", loginUrl)
              .replaceAll("{{Login URL}}", loginUrl)
              .replaceAll("{{loginUrl}}", loginUrl)
              .replaceAll("{{portal_url}}", loginUrl)
              .replaceAll("{{Portal URL}}", loginUrl)
              .replaceAll("{{role}}", roleDisplayName)
              .replaceAll("{{Role}}", roleDisplayName)
              .replaceAll("{{roleName}}", roleDisplayName)
              .replaceAll("{{access_modules}}", permissionAccess)
              .replaceAll("{{accessModules}}", permissionAccess)
              .replaceAll("{{site_name}}", "Uthsava Admin")
              .replaceAll("{{Platform Name}}", "Uthsava")
              .replaceAll("{{siteName}}", "Uthsava Admin");

            if (
              !htmlContent.includes("{{login_url}}") &&
              !emailTemplate.description.includes("{{login_url}}") &&
              !htmlContent.includes(loginUrl)
            ) {
              htmlContent += `
                <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
              `;
            }

            if (
              !htmlContent.includes("{{access_modules}}") &&
              !emailTemplate.description.includes("{{access_modules}}") &&
              !htmlContent.includes(permissionAccess)
            ) {
              htmlContent += `
                <p><strong>Assigned admin access:</strong> ${permissionAccess}</p>
              `;
            }

            sendMail(
              newSubAdmin.email,
              emailSubject,
              htmlContent,
            ).then(() => {
              logger.info(`[WELCOME EMAIL] Sent successfully to ${newSubAdmin.email}`);
            }).catch((emailError: any) => {
              logger.error("Failed to send welcome email:", emailError);
            });
          } else {
            const fallbackBody = `
              <div style="font-family: 'Inter', Arial, sans-serif; color: #1f2937; max-width: 600px; line-height: 1.6;">
                <h2 style="color: #111827; margin-top: 0;">Welcome to Uthsava Admin</h2>
                <p>Hello <strong>${subAdminName}</strong>,</p>
                <p>A new administrative account has been created for you with the role <strong>${roleDisplayName}</strong>.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Portal Login URL:</strong> <a href="${loginUrl}" style="color: #6366f1; text-decoration: underline; font-weight: 600;">${loginUrl}</a></p>
                  <p style="margin: 0 0 10px 0;"><strong>Email Address:</strong> ${newSubAdmin.email}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Initial Password:</strong> <code style="background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">${temporaryPassword}</code></p>
                  <p style="margin: 0;"><strong>Assigned Permissions:</strong> ${permissionAccess}</p>
                </div>

                <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
                  🔒 <em>For security purposes, please log in and update your password immediately.</em>
                </p>
              </div>
            `;

            sendMail(
              newSubAdmin.email,
              "Welcome to Uthsava Admin - Your Account Credentials",
              fallbackBody,
            ).then(() => {
              logger.info(`[WELCOME EMAIL] Fallback sent successfully to ${newSubAdmin.email}`);
            }).catch((emailError: any) => {
              logger.error(
                "Failed to send fallback welcome email:",
                emailError,
              );
            });
          }
        })
        .catch((emailError: any) => {
          logger.error(
            "Failed to fetch email template for subadmin:",
            emailError,
          );
        });

      return {
        subAdmin: newSubAdmin,
        temporaryPassword,
      };
    } catch (error: any) {
      logger.error("Create subadmin error:", error);
      throw error;
    }
  }
  /**
   * Update subadmin
   */
  static async updateSubAdmin(
    id: string,
    updateData: Partial<ISubAdmin & IUser>,
    req?: Request,
  ): Promise<ISubAdmin | null> {
    try {
      // Start with fetching the user to ensure role is correct
      const user = (await SubAdmin.findOne({ _id: id, role: Role.ADMIN_SUB_USER })) as any;

      if (!user) {
        throw new Error(ERROR_MESSAGES.SUBADMIN_NOT_FOUND);
      }

      const previousRoleId = user.roleId ? String(user.roleId) : null;
      let roleModified = false;

      // If updating email, check uniqueness
      if (updateData.email && updateData.email.toLowerCase().trim() !== user.email?.toLowerCase().trim()) {
        const existingEmail = await User.findOne({
          email: updateData.email.toLowerCase().trim(),
          status: { $ne: UserStatus.DELETED },
          _id: { $ne: id },
        });
        if (existingEmail) {
          throw new Error(ERROR_MESSAGES.EMAIL_EXISTS);
        }
      }

      // If updating mobile or countryCode, check uniqueness
      const targetCountryCode = updateData.countryCode !== undefined ? updateData.countryCode : user.countryCode;
      const targetMobile = updateData.mobile !== undefined ? updateData.mobile : user.mobile;
      if (
        (updateData.mobile !== undefined && updateData.mobile !== user.mobile) ||
        (updateData.countryCode !== undefined && updateData.countryCode !== user.countryCode)
      ) {
        if (targetMobile && targetCountryCode !== undefined) {
          const existingMobile = await User.findOne({
            countryCode: Number(targetCountryCode),
            mobile: targetMobile,
            status: { $ne: UserStatus.DELETED },
            _id: { $ne: id },
          });
          if (existingMobile) {
            throw new Error(ERROR_MESSAGES.MOBILE_EXISTS);
          }
        }
      }

      // Handle permissions and role update
      let permissionsUpdated = false;

      if (updateData.customPermissions || (updateData as any).subAdminPermissions) {
        let incomingPermissions: any = updateData.customPermissions || (updateData as any).subAdminPermissions;
        if (typeof incomingPermissions === "string") {
          try {
            incomingPermissions = JSON.parse(incomingPermissions);
          } catch {
            incomingPermissions = undefined;
          }
        }

        user.customPermissions = sanitizeSubAdminPermissions(
          incomingPermissions,
        ) as any;
        permissionsUpdated = true;
        delete updateData.customPermissions;
        delete (updateData as any).subAdminPermissions;
      }

      if ((updateData as any).roleId) {
        if (String((updateData as any).roleId) !== previousRoleId) {
          roleModified = true;
        }
        user.roleId = (updateData as any).roleId;
        permissionsUpdated = true;
      }

      if (permissionsUpdated) {
        const roleIdToUse = user.roleId;
        if (roleIdToUse) {
          const role = await RoleModel.findById(roleIdToUse);
          if (role) {
            user.permissions = mergeRoleAndCustomPermissions(
              role.permissions,
              user.customPermissions
            ) as any;
          }
        }
        user.isActionRequired = false; // Reset flag since admin has reviewed/updated
      }

      // Clear refresh token on update
      user.refreshToken = undefined;
      if (updateData.status === UserStatus.INACTIVE) {
        const appUser = user as IUser;
        appUser.deviceToken = undefined;
        appUser.deviceType = undefined;
        appUser.deviceId = undefined;
      }

      if ((updateData as any).address !== undefined) {
        updateData.location = (updateData as any).address;
        delete (updateData as any).address;
      }

      if (
        updateData.firstName !== undefined ||
        updateData.lastName !== undefined
      ) {
        updateData.fullName =
          `${updateData.firstName || user.firstName || ""} ${updateData.lastName || user.lastName || ""}`.trim();
      }

      Object.assign(user, updateData);
      const savedUser = await user.save();

      // Trigger notification email if role or permissions were edited
      if (roleModified || permissionsUpdated) {
        (async () => {
          try {
            let roleDisplayName = "Assigned Role";
            let permissionAccess = "General Administrative Access";

            if (savedUser.roleId) {
              const assignedRole = await RoleModel.findById(savedUser.roleId);
              if (assignedRole) {
                roleDisplayName = assignedRole.name;
              }
            }

            if (savedUser.permissions && typeof savedUser.permissions === "object") {
              const granted = Object.entries(savedUser.permissions)
                .filter(([_, val]: [string, any]) => Boolean(val && (val === true || val.all || val.view || val.create || val.edit)))
                .map(([key]) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
              if (granted.length > 0) {
                permissionAccess = granted.join(", ");
              }
            }

            const loginUrl = (updateData as any)?.adminUrl || (req?.body as any)?.adminUrl || getAdminBaseUrl(req);
            const subAdminName =
              `${savedUser.firstName || ""} ${savedUser.lastName || ""}`.trim() ||
              savedUser.fullName ||
              "Sub-Admin";

            const tpl = await EmailTemplate.findOne({
              keyword: { $in: ["UPDATE_SUBADMIN_ROLE", "SUBADMIN_ROLE_UPDATED"] },
              status: "active",
            });

            if (tpl && tpl.description) {
              let emailBody = tpl.description;
              let emailSubject =
                tpl.subject || "Your Uthsava Admin Role & Access Have Been Updated";

              const replacements: Record<string, string> = {
                "{{Platform Name}}": "Uthsava",
                "{{platformName}}": "Uthsava",
                "{{Platform_Name}}": "Uthsava",
                "{{site_name}}": "Uthsava",
                "{{User Name}}": subAdminName,
                "{{userName}}": subAdminName,
                "{{name}}": subAdminName,
                "{{firstName}}": savedUser.firstName || subAdminName,
                "{{Email}}": savedUser.email || "",
                "{{email}}": savedUser.email || "",
                "{{Role Name}}": roleDisplayName,
                "{{roleName}}": roleDisplayName,
                "{{Role}}": roleDisplayName,
                "{{role}}": roleDisplayName,
                "{{Login URL}}": loginUrl,
                "{{login_url}}": loginUrl,
                "{{portal_url}}": loginUrl,
                "{{Access Modules}}": permissionAccess,
                "{{access_modules}}": permissionAccess,
                "{{accessModules}}": permissionAccess,
              };

              for (const [tag, val] of Object.entries(replacements)) {
                emailSubject = emailSubject.replaceAll(tag, val);
                emailBody = emailBody.replaceAll(tag, val);
              }

              await sendMail(savedUser.email, emailSubject, emailBody);
              logger.info(`[ROLE UPDATE EMAIL] Successfully sent to ${savedUser.email}`);
            } else {
              const fallbackBody = `
                <div style="font-family: 'Inter', Arial, sans-serif; color: #1f2937; max-width: 600px; line-height: 1.6;">
                  <h2 style="color: #111827; margin-top: 0;">Your Administrative Access Has Been Updated</h2>
                  <p>Hello <strong>${subAdminName}</strong>,</p>
                  <p>Your administrative role and permissions on the <strong>Uthsava Admin Portal</strong> have been updated by a platform administrator.</p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Assigned Role:</strong> <span style="color: #4f46e5; font-weight: 700;">${roleDisplayName}</span></p>
                    <p style="margin: 0 0 10px 0;"><strong>Email Address:</strong> ${savedUser.email}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Portal Login URL:</strong> <a href="${loginUrl}" style="color: #6366f1; text-decoration: underline; font-weight: 600;">${loginUrl}</a></p>
                    <p style="margin: 0;"><strong>Active Permissions:</strong> ${permissionAccess}</p>
                  </div>

                  <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
                    🔒 <em>If you are currently logged in, please refresh your session or log in again to activate your updated permissions.</em>
                  </p>
                </div>
              `;

              await sendMail(
                savedUser.email,
                "Your Uthsava Admin Role & Access Have Been Updated",
                fallbackBody,
              );
              logger.info(`[ROLE UPDATE EMAIL] Fallback sent to ${savedUser.email}`);
            }
          } catch (err: any) {
            logger.error("Error sending subadmin role update email:", err);
          }
        })();
      }

      return savedUser;
    } catch (error: any) {
      console.error("[SubAdminService.updateSubAdmin] Error:", error.message);
      logger.error("Update subadmin error:", error);
      throw error;
    }
  }

  /**
   * Delete subadmin
   */
  static async deleteSubAdmin(id: string): Promise<void> {
    try {
      const user = await User.findOneAndUpdate(
        { _id: id, role: Role.ADMIN_SUB_USER },
        {
          status: UserStatus.DELETED,
          refreshToken: undefined,
          $unset: { deviceToken: 1, deviceType: 1, deviceId: 1 }
        },
        { new: true },
      );
      if (!user) {
        throw new Error(ERROR_MESSAGES.SUBADMIN_NOT_FOUND);
      }
    } catch (error: any) {
      logger.error("Delete subadmin error:", error);
      throw error;
    }
  }

  static async listSubAdminActivities(
    id: string,
    pagination: PaginationParams,
  ): Promise<any> {
    const subAdmin = await User.findOne({
      _id: id,
      role: Role.ADMIN_SUB_USER,
    }).select("_id");
    if (!subAdmin) {
      throw new Error(ERROR_MESSAGES.SUBADMIN_NOT_FOUND);
    }

    const parsedParams = PaginationHelper.parseParams(
      { ...pagination, sortBy: pagination.sortBy || "createdAt" },
      ["module", "action", "method", "statusCode", "createdAt", "updatedAt"],
    );

    return PaginationHelper.paginate(
      SubAdminActivity,
      { subAdminId: subAdmin._id },
      parsedParams,
    );
  }

  /**
   * Sanitize subadmin response
   */
  static sanitizeSubAdmin(user: any): any {
    if (!user) return null;

    const sanitized = user.toObject ? user.toObject() : user;

    // Convert Map to plain object if needed
    if (
      sanitized.customPermissions &&
      sanitized.customPermissions instanceof Map
    ) {
      const customPermissionsObj: Record<string, any> = {};
      sanitized.customPermissions.forEach((value: any, key: string) => {
        customPermissionsObj[key] = value;
      });
      sanitized.customPermissions = customPermissionsObj;
    }

    if (
      sanitized.permissions &&
      sanitized.permissions instanceof Map
    ) {
      const permissionsObj: Record<string, any> = {};
      sanitized.permissions.forEach((value: any, key: string) => {
        permissionsObj[key] = value;
      });
      sanitized.permissions = permissionsObj;
    }

    sanitized.customPermissions = sanitizeSubAdminPermissions(
      sanitized.customPermissions,
    );
    sanitized.permissions = sanitizeSubAdminPermissions(
      sanitized.permissions,
    );
    sanitized.address = sanitized.location || "";

    delete sanitized.password;
    delete sanitized.refreshToken;
    delete sanitized.__v;
    return sanitized;
  }
}
