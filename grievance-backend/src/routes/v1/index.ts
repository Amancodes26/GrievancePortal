import { Router } from "express";
import userRoutes from "./users.routes";
import grievanceRoutes from "./grievance.routes";
import deptAdminRoutes from "./deptAdmin.routes";
import attachmentRoutes from "./attachments.routes";
import superAdminRoutes from "./superAdmin.routes";
import adminRoutes from "./admin.routes";

const router = Router();
// Import all v1 routes
router.use("/users", userRoutes);
router.use("/grievances", grievanceRoutes);
router.use("/dept-admin", deptAdminRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/admin", adminRoutes);

export default router;