import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  getMe,
  changePassword,
  getCenterAdmins,
  resetCenterAdminPassword,
} from "../controllers/auth.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Rate limiter — max 10 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,   // sends RateLimit-* headers
  legacyHeaders: false,
});

// Public route
router.post("/login", loginLimiter, login);

// Protected routes
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);

// Only SUPER_ADMIN can create users
router.post("/register", protect, authorize("SUPER_ADMIN"), register);

// Only SUPER_ADMIN can view and reset center admin accounts
router.get(
  "/center-admins",
  protect,
  authorize("SUPER_ADMIN"),
  getCenterAdmins
);

router.patch(
  "/center-admins/:id/reset-password",
  protect,
  authorize("SUPER_ADMIN"),
  resetCenterAdminPassword
);

export default router;