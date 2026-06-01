import express from "express";
import { protect, authorizeRoles } from "../middleware/auth.js";
import {
  getExamRegistrations,
  getExamRegistrationById,
  updateExamRegistrationStatus,
} from "../controllers/examRegistration.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("SUPER_ADMIN"));

router.get("/", getExamRegistrations);
router.get("/:id", getExamRegistrationById);
router.patch("/:id/status", updateExamRegistrationStatus);

export default router;