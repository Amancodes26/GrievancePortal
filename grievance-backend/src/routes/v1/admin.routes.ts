import { Router } from "express";
import { adminLogin, setAdminPassword, verifyAdminOtp, resendAdminOtp } from "../../controllers/adminAuth.controller";
import { getAdminProfile, getAdminDashboard } from "../../controllers/admin.controller";
import { verifyAdminJWT } from "../../middlewares/adminAuth.middleware";

const router = Router();

// Public admin routes (no authentication required)
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