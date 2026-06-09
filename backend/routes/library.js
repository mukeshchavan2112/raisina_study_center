import express from "express";
import { protect, authorizeRoles } from "../middleware/auth.js";
import {
  addBook,
  getBooks,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getIssues,
  markOverdue,
  getLibraryStudents,
  updateStudySpace,
  renewLibraryMembership,
} from "../controllers/library.js";

const router = express.Router();

router.use(protect);

// Library students
router.get("/students", getLibraryStudents);

router.put(
  "/students/:studentId/study-space",
  authorizeRoles("CENTER_ADMIN"),
  updateStudySpace
);

router.put(
  "/students/:studentId/renew",
  authorizeRoles("CENTER_ADMIN"),
  renewLibraryMembership
);

// Books
router.get("/books", getBooks);
router.post("/books", authorizeRoles("CENTER_ADMIN"), addBook);
router.put("/books/:id", authorizeRoles("CENTER_ADMIN"), updateBook);
router.delete("/books/:id", authorizeRoles("CENTER_ADMIN"), deleteBook);

// Issues
router.get("/issues", getIssues);
router.post("/issue", authorizeRoles("CENTER_ADMIN"), issueBook);
router.put("/return/:id", authorizeRoles("CENTER_ADMIN"), returnBook);
router.post(
  "/mark-overdue",
  authorizeRoles("SUPER_ADMIN", "CENTER_ADMIN"),
  markOverdue
);

export default router;