import { Router } from "express";
import * as roleController from "../controllers/role.controller";
import { validateBody } from "../../../core/middleware/validate.middleware";
import { createRoleSchema, updateRoleSchema } from "../validators/role.validator";

const router = Router();

router.post("/", validateBody(createRoleSchema), roleController.createRole);
router.get("/modules", roleController.getPermissionModules);
router.get("/", roleController.listRoles);
router.get("/:roleId", roleController.getRoleById);
router.put("/:roleId", validateBody(updateRoleSchema), roleController.updateRole);
router.delete("/:roleId", roleController.deleteRole);

export const roleRoutes = router;
