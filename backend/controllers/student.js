import asyncHandler from "express-async-handler";

import Student from "../models/Student.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import {
  resolveCenterScope,
  ensureCenterScope,
} from "../utils/accessControl.js";
import { generateRSC } from "../utils/rscGenerator.js";
import { generatePRN } from "../utils/prnGenerator.js";

const normalizeFacilities = (facilities = {}) => {
  return {
    mess: Boolean(facilities?.mess),
    hostel: Boolean(facilities?.hostel),
    library: Boolean(facilities?.library),
  };
};

const normalizeQualifyExams = (qualifyExams = []) => {
  if (!Array.isArray(qualifyExams)) return [];

  return qualifyExams
    .map((exam) => String(exam).trim())
    .filter((exam) => exam !== "");
};

// GET /api/students?studentType=SCHOLARSHIP&search=name&page=1&limit=20
export const getStudents = asyncHandler(async (req, res) => {
  const centerId = resolveCenterScope(req);

  const filter = {
    deleted: false,
  };

  if (centerId) {
    filter.center = centerId;
  }

  if (req.query.studentType) {
    filter.studentType = req.query.studentType;
  }

  if (req.query.search) {
    filter.$or = [
      { studentName: { $regex: req.query.search, $options: "i" } },
      { mobileNumber: { $regex: req.query.search, $options: "i" } },
      { rscNumber: { $regex: req.query.search, $options: "i" } },
      { prn: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate("center", "centerName centerCode city")
      .populate("hostel", "name")
      .populate("mess", "messName")
      .sort({ admissionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Student.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Students fetched", {
    students,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/students/:id
export const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    deleted: false,
  })
    .populate("center", "centerName centerCode city")
    .populate("hostel", "name type")
    .populate("mess", "messName monthlyFee");

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  ensureCenterScope(req, student.center._id);

  return sendSuccess(res, 200, "Student fetched", student);
});

// POST /api/students
// This is mainly for direct non-scholarship student creation.
// Scholarship students should come from merit-list admission flow.
export const createStudent = asyncHandler(async (req, res) => {
  const {
    centerId,

    studentName,
    mobileNumber,
    parentMobileNumber,
    dob,
    aadharNumber,

    addresses,
    education,
    percentage,
    hobbies,
    qualifyExams,
    targetedPost,
    aimOfLife,

    studentType,
    meritRank,
    admissionDate,

    facilities,
  } = req.body;

  const finalCenterId = resolveCenterScope(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  if (!studentName) {
    return sendError(res, 400, "studentName is required");
  }

  const finalStudentType = studentType || "NON_SCHOLARSHIP";

  if (!["SCHOLARSHIP", "NON_SCHOLARSHIP"].includes(finalStudentType)) {
    return sendError(
      res,
      400,
      "studentType must be SCHOLARSHIP or NON_SCHOLARSHIP",
    );
  }

  if (finalStudentType === "SCHOLARSHIP") {
    return sendError(
      res,
      400,
      "Scholarship students must be admitted from Merit Admission.",
    );
  }

  const finalFacilities = normalizeFacilities(facilities);

  const rscNumber = await generateRSC(finalCenterId);
  const prn = await generatePRN(finalCenterId);

  const student = new Student({
    rscNumber,
    prn,

    center: finalCenterId,

    studentName,
    mobileNumber,
    parentMobileNumber,

    dob,
    addresses: Array.isArray(addresses) ? addresses : [],

    education,
    percentage:
      percentage !== undefined && percentage !== ""
        ? Number(percentage)
        : undefined,

    hobbies,
    qualifyExams: normalizeQualifyExams(qualifyExams),
    targetedPost,
    aimOfLife,

    studentType: "NON_SCHOLARSHIP",
    meritRank: meritRank || null,

    admissionDate: admissionDate || new Date(),

    facilities: finalFacilities,
    libraryAccess: finalFacilities.library,

    libraryProfile: {
      isAssigned: false,
      joiningDate: finalFacilities.library ? admissionDate || new Date() : null,
      seatNo: "",
      monthlyFee: 0,
      status: finalFacilities.library ? "ACTIVE" : "INACTIVE",
      remarks: "",
    },

    deleted: false,
  });

  if (aadharNumber) student.setAadhaarNumber(aadharNumber);
  await student.save();

  return sendSuccess(res, 201, "Student admitted", {
    student,
    rscNumber,
    prn,
  });
});

// PUT /api/students/:id
export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  ensureCenterScope(req, student.center);

  const allowedFields = [
    "studentName",
    "mobileNumber",
    "parentMobileNumber",
    "dob",
    "addresses",
    "education",
    "percentage",
    "hobbies",
    "qualifyExams",
    "targetedPost",
    "aimOfLife",
    "meritRank",
    "admissionDate",
  ];

  if (req.body.aadharNumber) {
    student.setAadhaarNumber(req.body.aadharNumber);
  }

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      student[field] = req.body[field];
    }
  });

  if (req.body.qualifyExams !== undefined) {
    student.qualifyExams = normalizeQualifyExams(req.body.qualifyExams);
  }

  if (req.body.facilities !== undefined) {
    student.facilities = normalizeFacilities(req.body.facilities);
    student.libraryAccess = student.facilities.library;

    if (!student.libraryProfile) {
      student.libraryProfile = {};
    }

    if (student.libraryAccess) {
      if (!student.libraryProfile.joiningDate) {
        student.libraryProfile.joiningDate = new Date();
      }

      if (
        !student.libraryProfile.status ||
        student.libraryProfile.status === "INACTIVE"
      ) {
        student.libraryProfile.status = "ACTIVE";
      }
    } else {
      student.libraryProfile.status = "INACTIVE";
    }
  }

  if (req.body.libraryAccess !== undefined) {
    student.libraryAccess = Boolean(req.body.libraryAccess);

    if (!student.facilities) {
      student.facilities = {};
    }

    student.facilities.library = student.libraryAccess;

    if (!student.libraryProfile) {
      student.libraryProfile = {};
    }

    if (student.libraryAccess) {
      if (!student.libraryProfile.joiningDate) {
        student.libraryProfile.joiningDate = new Date();
      }

      if (
        !student.libraryProfile.status ||
        student.libraryProfile.status === "INACTIVE"
      ) {
        student.libraryProfile.status = "ACTIVE";
      }
    } else {
      student.libraryProfile.status = "INACTIVE";
    }
  }

  await student.save();

  return sendSuccess(res, 200, "Student updated", student);
});

// DELETE /api/students/:id
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  ensureCenterScope(req, student.center);

  student.deleted = true;
  await student.save();

  return sendSuccess(res, 200, "Student record deleted");
});
