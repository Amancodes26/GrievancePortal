import { Router } from "express";
import { adminLogin, setAdminPassword, verifyAdminOtp, resendAdminOtp, simpleAdminLogin } from "../../controllers/adminAuth.controller";
import { getAdminProfile, getAdminDashboard } from "../../controllers/admin.controller";
import { verifyAdminJWT } from "../../middlewares/adminAuth.middleware";

const router = Router();

// Database migration route (for testing)
router.get("/migrate", (req, res) => {
  res.status(200).json({ 
    message: "Database migration endpoint", 
    status: "Database is already set up and running",
    tables: ["campusinfo", "programinfo", "admin", "grievance", "response", "grievancehistory", "attachment"]
  });
});

// Public admin routes (no authentication required)
// Simple admin login for testing (bypasses OTP)
router.post("/auth/simple-login", simpleAdminLogin);

// (No separate send OTP route; login sends OTP)
// Admin verify OTP (for login)
router.post("/auth/verify-otp", verifyAdminOtp);
// Admin resend OTP
router.post("/auth/resend-otp", resendAdminOtp);
// Admin login (after OTP verified)
router.post("/auth/login", adminLogin);
// Admin set/change password
router.post("/auth/set-password", setAdminPassword);

// Protected admin routes (authentication required)
// Admin profile
router.get("/profile", verifyAdminJWT, getAdminProfile);

// Admin dashboard
router.get("/dashboard", verifyAdminJWT, getAdminDashboard);

export default router;