import asyncHandler from "express-async-handler";
import Mess from "../models/Mess.js";
import Student from "../models/Student.js";
import MessEnrollment from "../models/MessEnrollment.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { resolveCenterScope, ensureCenterScope } from "../utils/accessControl.js";

const addMessCounts = async (messes) => {
  const result = [];

  for (const mess of messes) {
    const activeCount = await MessEnrollment.countDocuments({
      mess: mess._id,
      status: "ACTIVE",
      deleted: false,
    });

    result.push({
      ...mess,
      occupancy: activeCount,
      availableSeats: Math.max(Number(mess.capacity || 0) - activeCount, 0),
    });
  }

  return result;
};

const parseOptionalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// GET /api/messes
export const getMesses = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req, req.query.centerId);

  const filter = { deleted: false };
  if (centerId) filter.center = centerId;

  const messes = await Mess.find(filter)
    .populate("center", "centerName centerCode")
    .populate("hostel", "name")
    .sort("messName")
    .lean();

  const messesWithCounts = await addMessCounts(messes);

  return sendSuccess(res, 200, "Messes fetched", messesWithCounts);
});

// GET /api/messes/eligible-students
export const getEligibleMessStudents = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req, req.query.centerId);

  if (!centerId) {
    return sendError(res, 400, "centerId required");
  }

  const students = await Student.find({
    center: centerId,
    deleted: false,
    "facilities.mess": true,
  })
    .select(
      "studentName rscNumber prn studentType mobileNumber facilities mess admissionDate"
    )
    .populate("mess", "messName")
    .sort({ admissionDate: -1 });

  return sendSuccess(res, 200, "Mess facility students fetched", students);
});

// GET /api/messes/enrollments
export const getMessEnrollments = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req, req.query.centerId);

  if (!centerId) {
    return sendError(res, 400, "centerId required");
  }

  const enrollments = await MessEnrollment.find({
    center: centerId,
    deleted: false,
  })
    .populate("mess", "messName monthlyFee capacity")
    .populate(
      "student",
      "studentName rscNumber prn studentType mobileNumber facilities"
    )
    .sort({ createdAt: -1 });

  return sendSuccess(res, 200, "Mess enrollments fetched", enrollments);
});

// GET /api/messes/:id
export const getMessById = asyncHandler(async (req, res) => {
  const mess = await Mess.findOne({
    _id: req.params.id,
    deleted: false,
  })
    .populate("center", "centerName centerCode")
    .populate("hostel", "name");

  if (!mess) return sendError(res, 404, "Mess not found");

  ensureCenterScope(req, mess.center._id);

  return sendSuccess(res, 200, "Mess fetched", mess);
});

// POST /api/messes
export const createMess = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req);

  if (!centerId) {
    return sendError(res, 400, "centerId required");
  }

  const { messName, hostel, address, capacity, monthlyFee } = req.body;

  if (!messName || capacity === undefined || capacity === "") {
    return sendError(res, 400, "messName and capacity are required");
  }

  const parsedCapacity = Number(capacity);

  if (Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
    return sendError(res, 400, "Capacity must be a valid positive number");
  }

  const parsedMonthlyFee =
    monthlyFee !== undefined && monthlyFee !== "" ? Number(monthlyFee) : 0;

  const mess = await Mess.create({
    messName,
    hostel: hostel || null,
    address,
    capacity: parsedCapacity,
    monthlyFee: Number.isNaN(parsedMonthlyFee) ? 0 : parsedMonthlyFee,
    status: "ACTIVE",
    center: centerId,
  });

  return sendSuccess(res, 201, "Mess created", mess);
});

// PUT /api/messes/:id
export const updateMess = asyncHandler(async (req, res) => {
  const mess = await Mess.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!mess) return sendError(res, 404, "Mess not found");

  ensureCenterScope(req, mess.center);

  const { messName, hostel, address, capacity, monthlyFee, status } = req.body;

  if (messName !== undefined) mess.messName = messName;
  if (hostel !== undefined) mess.hostel = hostel || null;
  if (address !== undefined) mess.address = address;
  if (status !== undefined) mess.status = status;

  if (monthlyFee !== undefined && monthlyFee !== "") {
    const parsedMonthlyFee = Number(monthlyFee);
    if (!Number.isNaN(parsedMonthlyFee) && parsedMonthlyFee >= 0) {
      mess.monthlyFee = parsedMonthlyFee;
    }
  }

  if (capacity !== undefined && capacity !== "") {
    const parsedCapacity = Number(capacity);

    if (Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
      return sendError(res, 400, "Capacity must be a valid positive number");
    }

    const activeCount = await MessEnrollment.countDocuments({
      mess: mess._id,
      status: "ACTIVE",
      deleted: false,
    });

    if (parsedCapacity < activeCount) {
      return sendError(
        res,
        400,
        "New capacity cannot be less than current active enrollments"
      );
    }

    mess.capacity = parsedCapacity;
  }

  await mess.save();

  return sendSuccess(res, 200, "Mess updated", mess);
});

// DELETE /api/messes/:id
export const deleteMess = asyncHandler(async (req, res) => {
  const mess = await Mess.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!mess) return sendError(res, 404, "Mess not found");

  ensureCenterScope(req, mess.center);

  const activeCount = await MessEnrollment.countDocuments({
    mess: mess._id,
    status: "ACTIVE",
    deleted: false,
  });

  if (activeCount > 0) {
    return sendError(
      res,
      400,
      `${activeCount} students are enrolled in this mess. Unenroll them first.`
    );
  }

  mess.deleted = true;
  await mess.save();

  return sendSuccess(res, 200, "Mess deleted");
});

// POST /api/messes/:id/enroll
// Body: { studentId, planType, startDate, endDate, remarks }
export const enrollStudent = asyncHandler(async (req, res) => {
  const mess = await Mess.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!mess) return sendError(res, 404, "Mess not found");

  ensureCenterScope(req, mess.center);

  if (mess.status === "INACTIVE") {
    return sendError(res, 400, "This mess is currently inactive");
  }

  const { studentId, planType, startDate, endDate, monthlyFee, remarks } =
    req.body;

  if (!studentId) {
    return sendError(res, 400, "studentId is required");
  }

  const finalStartDate = startDate ? new Date(startDate) : new Date();
  const finalEndDate = parseOptionalDate(endDate);

  if (Number.isNaN(finalStartDate.getTime())) {
    return sendError(res, 400, "Invalid start date");
  }

  if (endDate && !finalEndDate) {
    return sendError(res, 400, "Invalid end date");
  }

  if (finalEndDate && finalEndDate < finalStartDate) {
    return sendError(res, 400, "End date cannot be before start date");
  }

  const student = await Student.findOne({
    _id: studentId,
    deleted: false,
  });

  if (!student) return sendError(res, 404, "Student not found");

  ensureCenterScope(req, student.center);

  if (student.center.toString() !== mess.center.toString()) {
    return sendError(res, 400, "Student and mess must belong to same center");
  }

  if (!student.facilities?.mess) {
    return sendError(
      res,
      400,
      "This student has not selected mess facility during admission"
    );
  }

  if (student.mess) {
    return sendError(
      res,
      400,
      "Student is already enrolled in a mess. Unenroll first."
    );
  }

  const activeCount = await MessEnrollment.countDocuments({
    mess: mess._id,
    status: "ACTIVE",
    deleted: false,
  });

  if (activeCount >= mess.capacity) {
    return sendError(res, 400, "Mess is at full capacity");
  }

  const existingEnrollment = await MessEnrollment.findOne({
    student: student._id,
    status: "ACTIVE",
    deleted: false,
  });

  if (existingEnrollment) {
    return sendError(res, 400, "Student already has an active mess enrollment");
  }

  const parsedMonthlyFee =
    monthlyFee !== undefined && monthlyFee !== "" ? Number(monthlyFee) : 0;

  const enrollment = await MessEnrollment.create({
    center: mess.center,
    mess: mess._id,
    student: student._id,
    planType: planType || "MONTHLY",
    startDate: finalStartDate,
    endDate: finalEndDate,
    monthlyFee: Number.isNaN(parsedMonthlyFee) ? 0 : parsedMonthlyFee,
    remarks,
    status: "ACTIVE",
  });

  student.mess = mess._id;
  await student.save();

  const populatedEnrollment = await MessEnrollment.findById(enrollment._id)
    .populate("mess", "messName monthlyFee capacity")
    .populate(
      "student",
      "studentName rscNumber prn studentType mobileNumber facilities"
    );

  return sendSuccess(
    res,
    200,
    "Student enrolled in mess",
    populatedEnrollment
  );
});

// POST /api/messes/:id/unenroll
// Body: { studentId, remarks }
export const unenrollStudent = asyncHandler(async (req, res) => {
  const mess = await Mess.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!mess) return sendError(res, 404, "Mess not found");

  ensureCenterScope(req, mess.center);

  const { studentId, remarks } = req.body;

  if (!studentId) {
    return sendError(res, 400, "studentId is required");
  }

  const student = await Student.findOne({
    _id: studentId,
    deleted: false,
  });

  if (!student) return sendError(res, 404, "Student not found");

  ensureCenterScope(req, student.center);

  if (!student.mess || student.mess.toString() !== mess._id.toString()) {
    return sendError(res, 400, "Student is not enrolled in this mess");
  }

  const enrollment = await MessEnrollment.findOne({
    mess: mess._id,
    student: student._id,
    status: "ACTIVE",
    deleted: false,
  });

  if (!enrollment) {
    return sendError(res, 404, "Active mess enrollment not found");
  }

  enrollment.status = "STOPPED";
  enrollment.endDate = new Date();
  if (remarks) enrollment.remarks = remarks;

  student.mess = null;

  await Promise.all([enrollment.save(), student.save()]);

  return sendSuccess(res, 200, "Student unenrolled from mess", {
    student,
    mess,
    enrollment,
  });
});

// POST /api/messes/enrollments/:id/renew
// Body: { startDate, endDate }
export const renewMessEnrollment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return sendError(res, 400, "startDate and endDate are required");
  }

  const finalStartDate = new Date(startDate);
  const finalEndDate = new Date(endDate);

  if (
    Number.isNaN(finalStartDate.getTime()) ||
    Number.isNaN(finalEndDate.getTime())
  ) {
    return sendError(res, 400, "Invalid renewal dates");
  }

  if (finalEndDate < finalStartDate) {
    return sendError(res, 400, "End date cannot be before start date");
  }

  const enrollment = await MessEnrollment.findOne({
    _id: id,
    deleted: false,
  });

  if (!enrollment) {
    return sendError(res, 404, "Mess enrollment not found");
  }

  ensureCenterScope(req, enrollment.center);

  const mess = await Mess.findOne({
    _id: enrollment.mess,
    deleted: false,
  });

  if (!mess) {
    return sendError(res, 404, "Mess not found");
  }

  const student = await Student.findOne({
    _id: enrollment.student,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  ensureCenterScope(req, student.center);

  const oldStatus = enrollment.status;

  if (oldStatus !== "ACTIVE") {
    const existingActiveEnrollment = await MessEnrollment.findOne({
      student: student._id,
      status: "ACTIVE",
      deleted: false,
      _id: { $ne: enrollment._id },
    });

    if (existingActiveEnrollment) {
      return sendError(
        res,
        400,
        "Student already has another active mess enrollment"
      );
    }

    const activeCount = await MessEnrollment.countDocuments({
      mess: mess._id,
      status: "ACTIVE",
      deleted: false,
    });

    if (activeCount >= mess.capacity) {
      return sendError(res, 400, "Mess is at full capacity. Cannot renew.");
    }
  }

  enrollment.startDate = finalStartDate;
  enrollment.endDate = finalEndDate;
  enrollment.status = "ACTIVE";

  student.mess = mess._id;

  await Promise.all([enrollment.save(), student.save()]);

  const populatedEnrollment = await MessEnrollment.findById(enrollment._id)
    .populate("mess", "messName monthlyFee capacity")
    .populate(
      "student",
      "studentName rscNumber prn studentType mobileNumber facilities"
    );

  return sendSuccess(
    res,
    200,
    "Mess membership renewed successfully",
    populatedEnrollment
  );
});

// GET /api/messes/:id/students
export const getMessStudents = asyncHandler(async (req, res) => {
  const mess = await Mess.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!mess) return sendError(res, 404, "Mess not found");

  ensureCenterScope(req, mess.center);

  const enrollments = await MessEnrollment.find({
    mess: mess._id,
    status: "ACTIVE",
    deleted: false,
  })
    .populate(
      "student",
      "studentName rscNumber prn studentType mobileNumber facilities"
    )
    .sort({ startDate: -1 });

  return sendSuccess(res, 200, "Mess students fetched", enrollments);
});