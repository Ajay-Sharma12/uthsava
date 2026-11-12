import Joi from "joi";
import { ALLOWED_SUBADMIN_PERMISSION_MODULES } from "../helpers/subadmin-permissions.helper";

const modulePermissionSchema = Joi.object({
  _id: Joi.any().strip(),
  id: Joi.any().strip(),
  view: Joi.boolean().default(false),
  create: Joi.boolean().default(false),
  edit: Joi.boolean().default(false),
  delete: Joi.boolean().default(false),
  all: Joi.boolean().default(false),
}).unknown(true);

const permissionsSchema = Joi.object()
  .pattern(
    Joi.string(),
    modulePermissionSchema,
  )
  .unknown(true);

export const createRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().max(200).optional().allow(""),
  status: Joi.string().valid("active", "inactive").optional(),
  permissions: permissionsSchema.optional(),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  description: Joi.string().trim().max(200).optional().allow(""),
  status: Joi.string().valid("active", "inactive").optional(),
  permissions: permissionsSchema.optional(),
});
