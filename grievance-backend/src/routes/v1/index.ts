import { Router } from "express";
import userRoutes from "./users.routes";
import grievanceRoutes from "./grievance.routes"; // Use the working routes
import deptAdminRoutes from "./deptAdmin.routes";
import campusAdminRoutes from "./campusAdmin.routes";
import attachmentRoutes from "./attachment.routes"; // Fixed to use default export
import superAdminRoutes from "./superAdmin.routes";
import adminRoutes from "./admin.routes";

const router = Router();
// Import all v1 routes
router.use("/users", userRoutes);
router.use("/grievances", grievanceRoutes); // Use the working routes
router.use("/dept-admin", deptAdminRoutes);
router.use("/campus-admin", campusAdminRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/admin", adminRoutes);

export default router;