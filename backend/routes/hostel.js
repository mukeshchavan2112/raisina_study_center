import { Router } from "express";
import { protect, authorizeRoles } from "../middleware/auth.js";

import {
  getHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
  allocateStudent,
  deallocateStudent,
  getHostelStudents,
  getEligibleHostelStudents,
  getHostelAllocations,
  renewHostelAllocation,
} from "../controllers/hostel.js";

const router = Router();

router.use(protect);
router.use(authorizeRoles("CENTER_ADMIN"));

// Important: keep these before "/:id"
router.get("/eligible-students", getEligibleHostelStudents);
router.get("/allocations", getHostelAllocations);
router.post("/allocations/:id/renew", renewHostelAllocation);

router.get("/", getHostels);
router.get("/:id", getHostelById);
router.get("/:id/students", getHostelStudents);

router.post("/", createHostel);
router.put("/:id", updateHostel);
router.delete("/:id", deleteHostel);

router.post("/:id/allocate", allocateStudent);
router.post("/:id/deallocate", deallocateStudent);

export default router;