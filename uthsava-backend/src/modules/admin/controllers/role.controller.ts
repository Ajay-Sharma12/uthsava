import { Request, Response } from "express";
import { RoleService } from "../services/role.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { logger } from "../../../core/constants/logger";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { PERMISSION_MODULES } from "../helpers/subadmin-permissions.helper";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";

export const createRole = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const role = await RoleService.createRole(req.body);

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.ROLES,
      action: "Create Role",
      entityId: (role as any)?._id || (role as any)?.id,
      newData: req.body,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(res, { role }, "role.created", lang, HTTP_STATUS.CREATED);
  } catch (error: any) {
    logger.error("Create role error:", error);
    const lang = getLanguage(req);
    if (error.message === "role.name_exists") {
      return ResponseHandler.validationError(res, { name: "Role name already exists" }, "validation.failed", lang);
    }
    return ResponseHandler.error(res, "general.error", lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const role = await RoleService.updateRole(req.params.roleId, req.body);
    if (!role) {
      return ResponseHandler.error(res, "role.not_found", lang, HTTP_STATUS.NOT_FOUND);
    }

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.ROLES,
      action: "Update Role",
      entityId: req.params.roleId,
      newData: req.body,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(res, { role }, "role.updated", lang);
  } catch (error: any) {
    logger.error("Update role error:", error);
    const lang = getLanguage(req);
    if (error.message === "role.not_found") {
      return ResponseHandler.error(res, "role.not_found", lang, HTTP_STATUS.NOT_FOUND);
    }
    if (error.message === "role.name_exists") {
      return ResponseHandler.validationError(res, { name: "Role name already exists" }, "validation.failed", lang);
    }
    return ResponseHandler.error(res, "general.error", lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

export const getRoleById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const role = await RoleService.getRoleById(req.params.roleId);
    if (!role) {
      return ResponseHandler.error(res, "role.not_found", lang, HTTP_STATUS.NOT_FOUND);
    }
    return ResponseHandler.success(res, { role }, "role.retrieved", lang);
  } catch (error: any) {
    logger.error("Get role error:", error);
    return ResponseHandler.error(res, "general.error", getLanguage(req), HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

export const listRoles = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { search, status } = req.query;
    
    const pagination = PaginationHelper.parseParams(req.query, ["name", "createdAt", "updatedAt"]);
    const query = QueryBuilder.buildListingQuery({
      search: search as string,
      searchFields: ["name"],
    });

    if (status) {
      if (status === "active") {
        query.$or = [
          { status: "active" },
          { status: { $exists: false } },
        ];
      } else {
        query.status = status as string;
      }
    }

    const result = await RoleService.listRoles(pagination, query);
    
    return ResponseHandler.success(res, result, "role.listed", lang);
  } catch (error: any) {
    logger.error("List roles error:", error);
    return ResponseHandler.error(res, "general.error", getLanguage(req), HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    await RoleService.deleteRole(req.params.roleId);

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.ROLES,
      action: "Delete Role",
      entityId: req.params.roleId,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(res, null, "role.deleted", lang);
  } catch (error: any) {
    logger.error("Delete role error:", error);
    const lang = getLanguage(req);
    if (error.message === "role.not_found") {
      return ResponseHandler.error(res, "role.not_found", lang, HTTP_STATUS.NOT_FOUND);
    }
    if (error.message === "role.in_use") {
      return ResponseHandler.error(res, "error.roleIsCurrentlyAssignedToOneOrMoreSubadmins", lang, HTTP_STATUS.BAD_REQUEST);
    }
    return ResponseHandler.error(res, "general.error", lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

export const getPermissionModules = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    return ResponseHandler.success(res, { modules: PERMISSION_MODULES }, "role.modules_retrieved", lang);
  } catch (error: any) {
    logger.error("Get permission modules error:", error);
    return ResponseHandler.error(res, "general.error", getLanguage(req), HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};
