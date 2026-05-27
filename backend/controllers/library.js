import asyncHandler from "express-async-handler";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { resolveCenterScope } from "../utils/accessControl.js";
import LibraryBook from "../models/LibraryBook.js";
import LibraryIssue from "../models/LibraryIssue.js";
import Student from "../models/Student.js";

const FINE_PER_DAY = 2;

// Helper: builds center filter according to role
const buildCenterFilter = (req, overrideCenterId = null) => {
  const centerId = resolveCenterScope(req, overrideCenterId);
  return centerId ? { center: centerId } : {};
};

// ─── LIBRARY STUDENTS ─────────────────────────────────────

export const getLibraryStudents = asyncHandler(async (req, res) => {
  const centerFilter = buildCenterFilter(req, req.query.centerId);

  const students = await Student.find({
    ...centerFilter,
    libraryAccess: true,
    deleted: false,
  })
    .select(
      "studentName rscNumber mobileNumber admissionDate facilities libraryAccess libraryProfile center",
    )
    .populate("center", "centerName centerCode city")
    .sort({ studentName: 1 });

  return sendSuccess(res, 200, "Library students fetched", students);
});

// ─── BOOKS ────────────────────────────────────────────────

export const addBook = asyncHandler(async (req, res) => {
  const { title, author, isbn, totalCopies, centerId } = req.body;

  const finalCenterId = resolveCenterScope(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  if (!title || !author) {
    return sendError(res, 400, "title and author are required");
  }

  const copies = Number(totalCopies);

  if (!Number.isFinite(copies) || copies < 1) {
    return sendError(res, 400, "totalCopies must be at least 1");
  }

  const book = await LibraryBook.create({
    title,
    author,
    isbn: isbn || null,
    center: finalCenterId,
    totalCopies: copies,
    availableCopies: copies,
  });

  return sendSuccess(res, 201, "Book added", book);
});

export const getBooks = asyncHandler(async (req, res) => {
  const { search, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    deleted: false,
  };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { author: { $regex: search, $options: "i" } },
      { isbn: { $regex: search, $options: "i" } },
    ];
  }

  const books = await LibraryBook.find(filter)
    .populate("center", "centerName centerCode city")
    .sort({ title: 1 });

  return sendSuccess(res, 200, "Books fetched", books);
});

export const updateBook = asyncHandler(async (req, res) => {
  const centerFilter = buildCenterFilter(req);

  const book = await LibraryBook.findOne({
    _id: req.params.id,
    ...centerFilter,
    deleted: false,
  });

  if (!book) {
    return sendError(res, 404, "Book not found");
  }

  const { title, author, isbn, totalCopies } = req.body;

  if (title !== undefined) book.title = title;
  if (author !== undefined) book.author = author;
  if (isbn !== undefined) book.isbn = isbn || null;

  if (totalCopies !== undefined) {
    const newTotalCopies = Number(totalCopies);

    if (!Number.isFinite(newTotalCopies) || newTotalCopies < 1) {
      return sendError(res, 400, "totalCopies must be at least 1");
    }

    const issuedCopies = book.totalCopies - book.availableCopies;

    if (newTotalCopies < issuedCopies) {
      return sendError(
        res,
        400,
        `Cannot set totalCopies below issued copies. Currently issued: ${issuedCopies}`,
      );
    }

    book.totalCopies = newTotalCopies;
    book.availableCopies = newTotalCopies - issuedCopies;
  }

  await book.save();

  return sendSuccess(res, 200, "Book updated", book);
});

export const deleteBook = asyncHandler(async (req, res) => {
  const centerFilter = buildCenterFilter(req);

  const book = await LibraryBook.findOne({
    _id: req.params.id,
    ...centerFilter,
    deleted: false,
  });

  if (!book) {
    return sendError(res, 404, "Book not found");
  }

  const activeIssues = await LibraryIssue.countDocuments({
    book: book._id,
    status: { $in: ["ISSUED", "OVERDUE"] },
  });

  if (activeIssues > 0) {
    return sendError(
      res,
      400,
      "Cannot delete this book because some copies are currently issued",
    );
  }

  book.deleted = true;
  await book.save();

  return sendSuccess(res, 200, "Book deleted");
});

// ─── ISSUE / RETURN ───────────────────────────────────────

export const issueBook = asyncHandler(async (req, res) => {
  const { bookId, studentId, dueDate } = req.body;

  if (!bookId || !studentId || !dueDate) {
    return sendError(res, 400, "bookId, studentId and dueDate are required");
  }

  const parsedDueDate = new Date(dueDate);

  if (Number.isNaN(parsedDueDate.getTime())) {
    return sendError(res, 400, "Invalid dueDate");
  }

  const centerFilter = buildCenterFilter(req);

  const book = await LibraryBook.findOne({
    _id: bookId,
    ...centerFilter,
    deleted: false,
  });

  if (!book) {
    return sendError(res, 404, "Book not found");
  }

  if (book.availableCopies < 1) {
    return sendError(res, 400, "No copies available");
  }

  const student = await Student.findOne({
    _id: studentId,
    center: book.center,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found in this center");
  }

  if (!student.libraryAccess) {
    return sendError(res, 403, "Student does not have library access");
  }

  const existing = await LibraryIssue.findOne({
    book: bookId,
    student: studentId,
    status: { $in: ["ISSUED", "OVERDUE"] },
  });

  if (existing) {
    return sendError(res, 400, "Student already has this book issued");
  }

  const issue = await LibraryIssue.create({
    book: bookId,
    student: studentId,
    center: book.center,
    issueDate: new Date(),
    dueDate: parsedDueDate,
  });

  book.availableCopies -= 1;
  await book.save();

  return sendSuccess(res, 201, "Book issued", issue);
});

export const returnBook = asyncHandler(async (req, res) => {
  const centerFilter = buildCenterFilter(req);

  const issue = await LibraryIssue.findOne({
    _id: req.params.id,
    ...centerFilter,
    status: { $in: ["ISSUED", "OVERDUE"] },
  });

  if (!issue) {
    return sendError(res, 404, "Issue record not found or already returned");
  }

  const returnDate = new Date();
  const dueDate = new Date(issue.dueDate);
  let fine = 0;

  if (returnDate > dueDate) {
    const overdueDays = Math.ceil(
      (returnDate - dueDate) / (1000 * 60 * 60 * 24),
    );

    fine = overdueDays * FINE_PER_DAY;
  }

  issue.returnDate = returnDate;
  issue.fine = fine;
  issue.status = "RETURNED";

  await issue.save();

  await LibraryBook.findByIdAndUpdate(issue.book, {
    $inc: { availableCopies: 1 },
  });

  return sendSuccess(res, 200, "Book returned", {
    fine,
    issue,
  });
});

export const getIssues = asyncHandler(async (req, res) => {
  const { status, studentId, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
  };

  if (status) filter.status = status;
  if (studentId) filter.student = studentId;

  const issues = await LibraryIssue.find(filter)
    .populate("book", "title author isbn")
    .populate("student", "studentName rscNumber mobileNumber")
    .populate("center", "centerName centerCode city")
    .sort({ issueDate: -1 });

  return sendSuccess(res, 200, "Issues fetched", issues);
});

export const markOverdue = asyncHandler(async (req, res) => {
  const centerId = req.body.centerId || req.query.centerId;

  const filter = {
    ...buildCenterFilter(req, centerId),
    status: "ISSUED",
    dueDate: { $lt: new Date() },
  };

  const result = await LibraryIssue.updateMany(filter, {
    $set: { status: "OVERDUE" },
  });

  return sendSuccess(res, 200, `${result.modifiedCount} issues marked overdue`);
});

const parseOptionalDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate && endDate < startDate) {
    return false;
  }

  return true;
};

export const updateStudySpace = asyncHandler(async (req, res) => {
  const centerFilter = buildCenterFilter(req);

  const {
    seatNo,
    joiningDate,
    startDate,
    endDate,
    monthlyFee,
    status,
    remarks,
    libraryAccess,
  } = req.body;

  const student = await Student.findOne({
    _id: req.params.studentId,
    ...centerFilter,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  if (status && !["ACTIVE", "INACTIVE", "COMPLETED"].includes(status)) {
    return sendError(res, 400, "Invalid study space status");
  }

  if (!student.libraryProfile) {
    student.libraryProfile = {};
  }

  if (libraryAccess !== undefined) {
    student.libraryAccess =
      libraryAccess === true || libraryAccess === "true";

    if (!student.facilities) {
      student.facilities = {};
    }

    student.facilities.library = student.libraryAccess;
  }

  if (!student.libraryAccess) {
    return sendError(
      res,
      400,
      "Student does not have library/study space access"
    );
  }

  const parsedJoiningDate =
    joiningDate !== undefined ? parseOptionalDate(joiningDate) : undefined;

  const parsedStartDate =
    startDate !== undefined ? parseOptionalDate(startDate) : undefined;

  const parsedEndDate =
    endDate !== undefined ? parseOptionalDate(endDate) : undefined;

  if (joiningDate && !parsedJoiningDate) {
    return sendError(res, 400, "Invalid joining date");
  }

  if (startDate && !parsedStartDate) {
    return sendError(res, 400, "Invalid start date");
  }

  if (endDate && !parsedEndDate) {
    return sendError(res, 400, "Invalid end date");
  }

  const finalStartDate =
    parsedStartDate !== undefined
      ? parsedStartDate
      : student.libraryProfile.startDate || parsedJoiningDate || null;

  const finalEndDate =
    parsedEndDate !== undefined ? parsedEndDate : student.libraryProfile.endDate;

  if (!validateDateRange(finalStartDate, finalEndDate)) {
    return sendError(res, 400, "End date cannot be before start date");
  }

  if (seatNo !== undefined) {
    student.libraryProfile.seatNo = seatNo;
  }

  if (joiningDate !== undefined) {
    student.libraryProfile.joiningDate = parsedJoiningDate;
  }

  if (startDate !== undefined) {
    student.libraryProfile.startDate = parsedStartDate;
  }

  if (endDate !== undefined) {
    student.libraryProfile.endDate = parsedEndDate;
  }

  // Legacy/backward-compatible only.
  // Do not expose this in the Library frontend anymore.
  if (monthlyFee !== undefined && monthlyFee !== "") {
    const fee = Number(monthlyFee);

    if (!Number.isFinite(fee) || fee < 0) {
      return sendError(res, 400, "monthlyFee must be a valid number");
    }

    student.libraryProfile.monthlyFee = fee;
  }

  if (status !== undefined) {
    student.libraryProfile.status = status;
  }

  if (remarks !== undefined) {
    student.libraryProfile.remarks = remarks;
  }

  if (student.libraryAccess && !student.libraryProfile.joiningDate) {
    student.libraryProfile.joiningDate = new Date();
  }

  if (student.libraryAccess && !student.libraryProfile.startDate) {
    student.libraryProfile.startDate =
      student.libraryProfile.joiningDate || new Date();
  }

  student.libraryProfile.isAssigned = true;

  if (
    !student.libraryProfile.status ||
    student.libraryProfile.status === "INACTIVE"
  ) {
    student.libraryProfile.status = "ACTIVE";
  }

  await student.save();

  return sendSuccess(res, 200, "Study space details updated", student);
});

// PUT /api/library/students/:studentId/renew
// Body: { startDate, endDate }
export const renewLibraryMembership = asyncHandler(async (req, res) => {
  const centerFilter = buildCenterFilter(req);
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return sendError(res, 400, "startDate and endDate are required");
  }

  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (
    Number.isNaN(parsedStartDate.getTime()) ||
    Number.isNaN(parsedEndDate.getTime())
  ) {
    return sendError(res, 400, "Invalid renewal dates");
  }

  if (parsedEndDate < parsedStartDate) {
    return sendError(res, 400, "End date cannot be before start date");
  }

  const student = await Student.findOne({
    _id: req.params.studentId,
    ...centerFilter,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  if (!student.libraryAccess && !student.facilities?.library) {
    return sendError(
      res,
      400,
      "Student does not have library/study space access"
    );
  }

  if (!student.libraryProfile) {
    student.libraryProfile = {};
  }

  student.libraryAccess = true;

  if (!student.facilities) {
    student.facilities = {};
  }

  student.facilities.library = true;

  student.libraryProfile.isAssigned = true;
  student.libraryProfile.startDate = parsedStartDate;
  student.libraryProfile.endDate = parsedEndDate;
  student.libraryProfile.status = "ACTIVE";

  if (!student.libraryProfile.joiningDate) {
    student.libraryProfile.joiningDate = parsedStartDate;
  }

  await student.save();

  return sendSuccess(
    res,
    200,
    "Library/study space membership renewed successfully",
    student
  );
});
