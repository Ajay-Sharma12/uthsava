import { Router } from "express";
import Joi from "joi";
import {
  listUsers,
  listUserLookup,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
} from "../controllers/user.controller";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import {
  listUserQuerySchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../validators/user.validator";

const router = Router();

/**
 * User Management Routes
 * Base path: /api/v1/admin/users
 *
 * Authentication and authorization are already applied by the parent admin router.
 */

const userIdParamSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

// User Management
router.get("/", validateQuery(listUserQuerySchema), listUsers);
router.get("/lookup", listUserLookup);
router.get("/:userId", validateParams(userIdParamSchema), getUserById);

router.post("/", validateBody(createUserSchema), createUser);

router.put(
  "/:userId",
  validateParams(userIdParamSchema),
  updateUser,
);

router.patch(
  "/:userId",
  validateParams(userIdParamSchema),
  updateUser,
);

router.delete("/:userId", validateParams(userIdParamSchema), deleteUser);

router.patch(
  "/:userId/status",
  validateParams(userIdParamSchema),
  validateBody(updateUserStatusSchema),
  updateUserStatus,
);

export default router;
