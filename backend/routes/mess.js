import { Router } from "express";
import { protect, authorizeRoles } from "../middleware/auth.js";

import {
  getMesses,
  getMessById,
  createMess,
  updateMess,
  deleteMess,
  enrollStudent,
  unenrollStudent,
  getMessStudents,
  getEligibleMessStudents,
  getMessEnrollments,
  renewMessEnrollment,
} from "../controllers/mess.js";

const router = Router();

router.use(protect);
router.use(authorizeRoles("CENTER_ADMIN"));

// Keep these before "/:id"
router.get("/eligible-students", getEligibleMessStudents);
router.get("/enrollments", getMessEnrollments);
router.post("/enrollments/:id/renew", renewMessEnrollment);

router.get("/", getMesses);
router.get("/:id", getMessById);
router.get("/:id/students", getMessStudents);

router.post("/", createMess);
router.put("/:id", updateMess);
router.delete("/:id", deleteMess);

router.post("/:id/enroll", enrollStudent);
router.post("/:id/unenroll", unenrollStudent);

export default router;