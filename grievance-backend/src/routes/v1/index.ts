import { Router } from "express";
import userRoutes from "./users.routes";
import grievanceRoutes from "./grievance.routes";

const router = Router();
// Import all v1 routes
router.use("/users", userRoutes);
router.use("/grievances", grievanceRoutes);

export default router;