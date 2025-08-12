import { Router } from "express";
import {
  rollNumberExist,
  verifyPartialEmail,
  login,
  setPassword,
} from "../../controllers/userAuth.controller";
// import { getUserProfile } from "../../controllers/user.controller";
import { verifyJWT } from "../../middlewares/userAuth.middleware";
const router = Router();


router.get("/auth/rollNumber-exist/:rollNumber", rollNumberExist);
router.get("/auth/verify-partial-email/:rollNumber/:email", verifyPartialEmail);
router.post("/auth/login", login);
router.post("/auth/set-password", setPassword);

// Protected routes
// router.get("/profile", verifyJWT, getUserProfile);

export default router;