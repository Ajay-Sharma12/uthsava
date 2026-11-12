import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import {
  couponIdParamSchema,
  couponListFiltersSchema,
  createCouponSchema,
  updateCouponSchema,
  couponStatusSchema,
  assignCouponUsersSchema,
} from "../validators/coupon.validator";
import {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  updateCouponStatus,
  assignUsersToCoupon,
} from "../controllers/coupon.controller";

const router = Router();

router.get("/", validateQuery(couponListFiltersSchema), listCoupons);
router.get("/:couponId", validateParams(couponIdParamSchema), getCouponById);
router.post("/", validateBody(createCouponSchema), createCoupon);
router.put(
  "/:couponId",
  validateParams(couponIdParamSchema),
  validateBody(updateCouponSchema),
  updateCoupon,
);
router.patch(
  "/:couponId/status",
  validateParams(couponIdParamSchema),
  validateBody(couponStatusSchema),
  updateCouponStatus,
);
router.patch(
  "/:couponId/assign-users",
  validateParams(couponIdParamSchema),
  validateBody(assignCouponUsersSchema),
  assignUsersToCoupon,
);

export default router;
