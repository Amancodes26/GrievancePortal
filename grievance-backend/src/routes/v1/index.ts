import { Router } from "express";
import userRoutes from "./users.routes";
import grievanceRoutes from "./grievance.routes";
import grievanceRoutesNew from "./grievance.routes.new"; // Import the new high-quality routes
import trackingRoutes from "./tracking.routes"; // Import tracking routes
import issueListRoutes from "./issueList.routes"; // Import IssueList routes
import deptAdminRoutes from "./deptAdmin.routes";
import campusAdminRoutes from "./campusAdmin.routes";
import { attachmentRoutes } from "./attachment.routes"; // Updated to use named export
import superAdminRoutes from "./superAdmin.routes";
import adminRoutes from "./admin.routes";

const router = Router();
// Import all v1 routes
router.use("/users", userRoutes);
router.use("/grievances", grievanceRoutesNew); // Use the new high-quality routes
router.use("/tracking", trackingRoutes); // Add tracking routes
router.use("/issues", issueListRoutes); // Add IssueList routes
router.use("/dept-admin", deptAdminRoutes);
router.use("/campus-admin", campusAdminRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/admin", adminRoutes);

export default router;