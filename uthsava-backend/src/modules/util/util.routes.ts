import { Router } from "express";
import utilRoutes from "./routes/util.routes";

const router = Router();

/**
 * Base path: /api/v1/util
 */
router.use("/", utilRoutes);

export default router;
