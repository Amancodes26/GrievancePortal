import { Router } from "express";
import { adminLogin, setAdminPassword } from "../../controllers/adminAuth.controller";
import { getAdminProfile, getAdminDashboard } from "../../controllers/admin.controller";
import { verifyAdminJWT } from "../../middlewares/adminAuth.middleware";

const router = Router();

// Database migration route (for testing)
router.get("/migrate", (req, res) => {
  res.status(200).json({ 
    message: "Database migration endpoint", 
    status: "Database is already set up and running",
    tables: ["campusinfo", "programinfo", "admin", "grievance", "tracking", "attachment"]
  });
});

// Public admin routes (no authentication required)
// Admin login with email and password
router.post("/auth/login", adminLogin);
// Admin set/change password
router.post("/auth/set-password", setAdminPassword);

// Protected admin routes (authentication required)
// Admin profile
router.get("/profile", verifyAdminJWT, getAdminProfile);

// Admin dashboard
router.get("/dashboard", verifyAdminJWT, getAdminDashboard);

export default router;