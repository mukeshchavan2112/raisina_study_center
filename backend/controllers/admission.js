import asyncHandler from "express-async-handler";
import { parse } from "csv-parse/sync";
import XLSX from "xlsx";
import MeritList from "../models/MeritList.js";
import Student from "../models/Student.js";
import Center from "../models/Center.js";
import ExamRegistration from "../models/ExamRegistration.js";

import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { resolveCenterScope } from "../utils/accessControl.js";
import { generateRSC } from "../utils/rscGenerator.js";
import { generatePRN } from "../utils/prnGenerator.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const toIdString = (value) => {
  if (!value) return null;
  if (value._id) return value._id.toString();
  return value.toString();
};

const normalizeColumnName = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_\-.]/g, "");
};

const getCellValue = (row, possibleKeys = []) => {
  const normalizedRow = {};

  Object.keys(row || {}).forEach((key) => {
    normalizedRow[normalizeColumnName(key)] = row[key];
  });

  for (const key of possibleKeys) {
    const normalizedKey = normalizeColumnName(key);

    if (
      normalizedRow[normalizedKey] !== undefined &&
      normalizedRow[normalizedKey] !== null &&
      String(normalizedRow[normalizedKey]).trim() !== ""
    ) {
      return normalizedRow[normalizedKey];
    }
  }

  return "";
};

const toCleanText = (value) => {
  return String(value || "").trim();
};

const toCleanNumber = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return NaN;
  }

  return Number(String(value).replace(/[^\d.]/g, ""));
};

const normalizeMeritEntry = (entry) => {
  const rank = getCellValue(entry, ["rank", "merit rank", "meritRank", "Rank"]);

  const name = getCellValue(entry, [
    "name",
    "fullName",
    "studentName",
    "Full Name",
    "Candidate",
    "Candidate Name",
  ]);

  const mobileNumber = getCellValue(entry, [
    "mobileNumber",
    "mobile",
    "phone",
    "Mobile Number",
    "Mobile No",
  ]);

  const registrationNumber = getCellValue(entry, [
    "registrationNumber",
    "Registration Number",
    "Registration No",
    "Reg No",
  ]);

  const score = getCellValue(entry, [
    "score",
    "marks",
    "Marks",
    "Score",
    "Total Marks",
  ]);

  return {
    rank: toCleanNumber(rank),
    name: toCleanText(name),
    mobileNumber: toCleanText(mobileNumber) || null,
    registrationNumber: toCleanText(registrationNumber) || null,
    score: toCleanNumber(score),
  };
};

const validateStudentType = (studentType) => {
  return ["SCHOLARSHIP", "NON_SCHOLARSHIP"].includes(studentType);
};

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

const parseMeritFile = (file) => {
  if (!file) return [];

  const originalName = file.originalname || "";
  const extension = originalName.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const raw = file.buffer.toString("utf8");

    return parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }

  if (extension === "xlsx" || extension === "xls") {
    const workbook = XLSX.read(file.buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("Excel file does not contain any sheet");
    }

    const sheet = workbook.Sheets[sheetName];

    return XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    });
  }

  throw new Error("Only CSV, XLSX, or XLS files are supported");
};

// ─── Merit List ─────────────────────────────────────────────────────────────

// GET /api/admission/merit-list?centerId=&year=
export const getMeritList = asyncHandler(async (req, res) => {
  const { centerId, year } = req.query;

  const scopeCenterId = resolveCenterScope(req, centerId);

  const filter = {
    deleted: false,
  };

  if (scopeCenterId) {
    filter.center = scopeCenterId;
  }

  if (year) {
    filter.year = Number(year);
  }

  const lists = await MeritList.find(filter)
    .populate("center", "centerName centerCode city state")
    .populate("uploadedBy", "firstName lastName email")
    .sort({ year: -1, createdAt: -1 });

  return sendSuccess(res, 200, "Merit lists fetched", lists);
});

// GET /api/admission/merit-list/:id
export const getMeritListById = asyncHandler(async (req, res) => {
  const list = await MeritList.findOne({
    _id: req.params.id,
    deleted: false,
  })
    .populate("center", "centerName centerCode city state")
    .populate("uploadedBy", "firstName lastName email")
    .populate(
      "entries.registrationId",
      "registrationNumber fullName mobileNumber dob addressLine status preferredCenter preferredExamCenter preferredAdmissionCenter",
    )
    .populate("entries.studentId", "studentName rscNumber prn studentType");

  if (!list) {
    return sendError(res, 404, "Merit list not found");
  }

  const listCenterId = toIdString(list.center);
  const scopeCenterId = resolveCenterScope(req, listCenterId);

  if (scopeCenterId && toIdString(scopeCenterId) !== listCenterId) {
    return sendError(res, 403, "You are not allowed to access this merit list");
  }

  return sendSuccess(res, 200, "Merit list fetched", list);
});

/**
 * POST /api/admission/merit-list
 *
 * JSON Body:
 * {
 *   centerId,
 *   year,
 *   scholarshipCutoffRank,
 *   entries: [
 *     { rank, name, mobileNumber, registrationNumber, score }
 *   ]
 * }
 *
 * CSV columns supported:
 * rank,name,mobileNumber,registrationNumber,score
 */
export const uploadMeritList = asyncHandler(async (req, res) => {
  const { centerId, year, scholarshipCutoffRank } = req.body;

  if (!centerId || !year) {
    return sendError(res, 400, "centerId and year are required");
  }

  const scopeCenterId = resolveCenterScope(req, centerId);

  if (scopeCenterId && toIdString(scopeCenterId) !== centerId.toString()) {
    return sendError(res, 403, "You are not allowed to upload for this center");
  }

  const center = await Center.findOne({
    _id: centerId,
    deleted: false,
  });

  if (!center) {
    return sendError(res, 404, "Center not found");
  }

  let entries = [];

  if (req.file) {
    const rows = parseMeritFile(req.file);
    entries = rows.map(normalizeMeritEntry);
  }

  if (!entries.length) {
    return sendError(res, 400, "No merit list entries provided");
  }

  for (const entry of entries) {
    if (!Number.isFinite(entry.rank)) {
      return sendError(
        res,
        400,
        `Invalid or missing rank in entry: ${JSON.stringify(entry)}`,
      );
    }

    if (!entry.name) {
      return sendError(
        res,
        400,
        `Invalid or missing name in entry: ${JSON.stringify(entry)}`,
      );
    }

    if (!Number.isFinite(entry.score)) {
      return sendError(
        res,
        400,
        `Invalid or missing score in entry: ${JSON.stringify(entry)}`,
      );
    }
  }

  entries.sort((a, b) => a.rank - b.rank);

  const seenRanks = new Set();
  const duplicateRanks = [];

  for (const entry of entries) {
    if (seenRanks.has(entry.rank)) {
      duplicateRanks.push(entry.rank);
    }

    seenRanks.add(entry.rank);
  }

  if (duplicateRanks.length > 0) {
    return sendError(
      res,
      400,
      `Duplicate ranks found: ${duplicateRanks.join(", ")}`,
    );
  }

  const examYear = Number(year);
  const linkedEntries = [];

  for (const entry of entries) {
    let registration = null;

    if (entry.registrationNumber) {
      registration = await ExamRegistration.findOne({
        registrationNumber: entry.registrationNumber,
        year: examYear,
        deleted: false,
        $or: [{ preferredExamCenter: centerId }, { preferredCenter: centerId }],
      });
    }

    if (!registration && entry.mobileNumber) {
      registration = await ExamRegistration.findOne({
        mobileNumber: entry.mobileNumber,
        year: examYear,
        deleted: false,
        $or: [{ preferredExamCenter: centerId }, { preferredCenter: centerId }],
      });
    }

    linkedEntries.push({
      rank: entry.rank,
      name: entry.name,
      mobileNumber: entry.mobileNumber || registration?.mobileNumber || null,
      registrationNumber:
        entry.registrationNumber || registration?.registrationNumber || null,
      score: entry.score,
      registrationId: registration?._id || null,
      studentId: null,
      admissionStatus: "PENDING",
    });
  }

  let list = await MeritList.findOne({
    center: centerId,
    year: examYear,
    deleted: false,
  });

  if (list) {
    list.entries = linkedEntries;
    list.uploadedBy = req.user._id;

    if (scholarshipCutoffRank !== undefined && scholarshipCutoffRank !== "") {
      list.scholarshipCutoffRank = Number(scholarshipCutoffRank);
    }

    await list.save();
  } else {
    list = await MeritList.create({
      center: centerId,
      uploadedBy: req.user._id,
      year: examYear,
      scholarshipCutoffRank:
        scholarshipCutoffRank !== undefined && scholarshipCutoffRank !== ""
          ? Number(scholarshipCutoffRank)
          : null,
      entries: linkedEntries,
    });
  }

  const bulkRegistrationUpdates = linkedEntries
    .filter((entry) => entry.registrationId)
    .map((entry) => ({
      updateOne: {
        filter: {
          _id: entry.registrationId,
          status: { $nin: ["ADMITTED", "CANCELLED"] },
        },
        update: {
          $set: {
            status: "MERIT_LISTED",
            linkedMeritList: list._id,
            meritRank: entry.rank,
            score: entry.score,
          },
        },
      },
    }));

  if (bulkRegistrationUpdates.length > 0) {
    await ExamRegistration.bulkWrite(bulkRegistrationUpdates);
  }

  const linkedCount = linkedEntries.filter(
    (entry) => entry.registrationId,
  ).length;
  const unlinkedCount = linkedEntries.length - linkedCount;

  return sendSuccess(res, 200, "Merit list uploaded successfully", {
    meritList: list,
    summary: {
      totalEntries: linkedEntries.length,
      linkedRegistrations: linkedCount,
      unlinkedEntries: unlinkedCount,
    },
  });
});

// PUT /api/admission/merit-list/:id/cutoff
// Body: { scholarshipCutoffRank: Number }
export const setCutoff = asyncHandler(async (req, res) => {
  const { scholarshipCutoffRank } = req.body;

  if (!scholarshipCutoffRank || isNaN(scholarshipCutoffRank)) {
    return sendError(res, 400, "scholarshipCutoffRank must be a valid number");
  }

  const list = await MeritList.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!list) {
    return sendError(res, 404, "Merit list not found");
  }

  const listCenterId = toIdString(list.center);
  const scopeCenterId = resolveCenterScope(req, listCenterId);

  if (scopeCenterId && toIdString(scopeCenterId) !== listCenterId) {
    return sendError(res, 403, "You are not allowed to update this merit list");
  }

  list.scholarshipCutoffRank = Number(scholarshipCutoffRank);
  await list.save();

  return sendSuccess(res, 200, "Cutoff rank set", list);
});

// DELETE /api/admission/merit-list/:id
export const deleteMeritList = asyncHandler(async (req, res) => {
  const list = await MeritList.findOne({
    _id: req.params.id,
    deleted: false,
  });

  if (!list) {
    return sendError(res, 404, "Merit list not found");
  }

  const listCenterId = toIdString(list.center);
  const scopeCenterId = resolveCenterScope(req, listCenterId);

  if (scopeCenterId && toIdString(scopeCenterId) !== listCenterId) {
    return sendError(res, 403, "You are not allowed to delete this merit list");
  }

  list.deleted = true;
  await list.save();

  return sendSuccess(res, 200, "Merit list deleted");
});

// GET /api/admission/next-rsc?centerId=...
export const getNextRSC = asyncHandler(async (req, res) => {
  const { centerId } = req.query;

  const scopeCenterId = resolveCenterScope(req, centerId);
  const finalCenterId = scopeCenterId || centerId;

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required to preview RSC number");
  }

  const center = await Center.findOne({
    _id: finalCenterId,
    deleted: false,
  });

  if (!center) {
    return sendError(res, 404, "Center not found");
  }

  const rscNumber = await generateRSC(finalCenterId);

  return sendSuccess(res, 200, "Next RSC number fetched", {
    rscNumber,
  });
});

// ─── Admit Student ──────────────────────────────────────────────────────────

/**
 * POST /api/admission/admit
 *
 * Merit admission:
 * {
 *   meritListId,
 *   entryRank,
 *   studentName,
 *   mobileNumber,
 *   parentMobileNumber,
 *   dob,
 *   aadharNumber,
 *   education,
 *   percentage,
 *   addresses,
 *   hobbies,
 *   qualifyExams,
 *   targetedPost,
 *   aimOfLife,
 *   facilities,
 *   admissionDate,
 *   overrideStudentType
 * }
 *
 * Direct non-scholarship admission:
 * {
 *   centerId,
 *   studentName,
 *   mobileNumber,
 *   parentMobileNumber,
 *   dob,
 *   aadharNumber,
 *   education,
 *   percentage,
 *   addresses,
 *   hobbies,
 *   qualifyExams,
 *   targetedPost,
 *   aimOfLife,
 *   facilities,
 *   admissionDate,
 *   overrideStudentType: "NON_SCHOLARSHIP"
 * }
 */
export const admitStudent = asyncHandler(async (req, res) => {
  const {
    meritListId,
    entryRank,

    centerId,
    preferredExamCenter,
    preferredAdmissionCenter,
    studentName,
    mobileNumber,
    parentMobileNumber,
    dob,
    aadharNumber,

    education,
    percentage,
    addresses,
    hobbies,
    qualifyExams,
    targetedPost,
    aimOfLife,

    facilities,
    admissionDate,
    overrideStudentType,
  } = req.body;

  let finalCenterId = centerId || null;
  let finalStudentName = studentName || null;
  let finalMobileNumber = mobileNumber || null;
  let finalDob = dob || null;
  let finalAddresses = Array.isArray(addresses) ? addresses : [];

  let studentType = null;
  let meritRank = null;
  let selectedMeritList = null;
  let selectedEntry = null;
  let linkedRegistration = null;

  const finalFacilities = normalizeFacilities(facilities);
  const finalQualifyExams = normalizeQualifyExams(qualifyExams);

  if (overrideStudentType && !validateStudentType(overrideStudentType)) {
    return sendError(
      res,
      400,
      "overrideStudentType must be SCHOLARSHIP or NON_SCHOLARSHIP",
    );
  }

  // Case 1: Admission from merit list
  if (meritListId && entryRank) {
    selectedMeritList = await MeritList.findOne({
      _id: meritListId,
      deleted: false,
    });

    if (!selectedMeritList) {
      return sendError(res, 404, "Merit list not found");
    }

    selectedEntry = selectedMeritList.entries.find(
      (entry) => Number(entry.rank) === Number(entryRank),
    );

    if (!selectedEntry) {
      return sendError(
        res,
        404,
        `No entry with rank ${entryRank} in merit list`,
      );
    }

    if (
      selectedEntry.studentId ||
      selectedEntry.admissionStatus === "ADMITTED"
    ) {
      return sendError(res, 409, "This merit list entry is already admitted");
    }

    if (selectedEntry.registrationId) {
      linkedRegistration = await ExamRegistration.findById(
        selectedEntry.registrationId,
      );
    }

    const examCenterId = toIdString(
      linkedRegistration?.preferredExamCenter ||
        linkedRegistration?.preferredCenter ||
        preferredExamCenter ||
        selectedMeritList.center,
    );

    const admissionCenterId = toIdString(
      linkedRegistration?.preferredAdmissionCenter ||
        preferredAdmissionCenter ||
        centerId ||
        selectedMeritList.center,
    );

    finalCenterId = admissionCenterId;

    if (!finalCenterId) {
      return sendError(res, 400, "Preferred admission center is required");
    }

    if (centerId && centerId.toString() !== finalCenterId) {
      return sendError(
        res,
        400,
        "This candidate selected another center for admission",
      );
    }

    const scopeCenterId = resolveCenterScope(req, finalCenterId);

    if (scopeCenterId && toIdString(scopeCenterId) !== finalCenterId) {
      return sendError(
        res,
        403,
        "You are not allowed to admit for this center",
      );
    }

    meritRank = selectedEntry.rank;

    finalStudentName =
      finalStudentName || selectedEntry.name || linkedRegistration?.fullName;

    finalMobileNumber =
      finalMobileNumber ||
      selectedEntry.mobileNumber ||
      linkedRegistration?.mobileNumber;

    finalDob = finalDob || linkedRegistration?.dob || null;

    if (
      (!finalAddresses || finalAddresses.length === 0) &&
      linkedRegistration?.addressLine
    ) {
      finalAddresses = [
        {
          addressType: "HOME",
          addressLine: linkedRegistration.addressLine,
        },
      ];
    }

    if (overrideStudentType) {
      studentType = overrideStudentType;
    } else {
      if (!selectedMeritList.scholarshipCutoffRank) {
        return sendError(
          res,
          400,
          "Scholarship cutoff rank has not been set for this merit list",
        );
      }

      studentType =
        selectedEntry.rank <= selectedMeritList.scholarshipCutoffRank
          ? "SCHOLARSHIP"
          : "NON_SCHOLARSHIP";
    }
  }

  // Case 2: Direct admission
  else {
    if (!centerId) {
      return sendError(res, 400, "centerId is required for direct admission");
    }

    const scopeCenterId = resolveCenterScope(req, centerId);

    if (scopeCenterId && toIdString(scopeCenterId) !== centerId.toString()) {
      return sendError(
        res,
        403,
        "You are not allowed to admit for this center",
      );
    }

    finalCenterId = centerId;

    if (overrideStudentType === "SCHOLARSHIP") {
      return sendError(
        res,
        400,
        "Direct admission cannot be SCHOLARSHIP. Scholarship students must come from merit list.",
      );
    }

    studentType = "NON_SCHOLARSHIP";
  }

  if (!finalCenterId || !finalStudentName) {
    return sendError(res, 400, "centerId and studentName are required");
  }

  const center = await Center.findOne({
    _id: finalCenterId,
    deleted: false,
  });

  if (!center) {
    return sendError(res, 404, "Center not found");
  }

  const rscNumber = await generateRSC(finalCenterId);
  const prn = await generatePRN(finalCenterId);
  const student = new Student({
    rscNumber,
    prn,

    center: finalCenterId,

    studentName: finalStudentName,
    mobileNumber: finalMobileNumber,
    parentMobileNumber: parentMobileNumber || null,

    dob: finalDob,
    addresses: finalAddresses,

    education: education || null,
    percentage:
      percentage !== undefined && percentage !== ""
        ? Number(percentage)
        : undefined,

    hobbies: hobbies || null,
    qualifyExams: finalQualifyExams,
    targetedPost: targetedPost || null,
    aimOfLife: aimOfLife || null,

    studentType,
    meritRank,

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
  });

  if (aadharNumber) student.setAadhaarNumber(aadharNumber);
  await student.save();

  if (selectedMeritList && selectedEntry) {
    selectedEntry.studentId = student._id;
    selectedEntry.admissionStatus = "ADMITTED";

    await selectedMeritList.save();
  }

  if (linkedRegistration) {
    linkedRegistration.status = "ADMITTED";
    linkedRegistration.linkedStudent = student._id;
    linkedRegistration.linkedMeritList = selectedMeritList?._id || null;
    linkedRegistration.meritRank = meritRank;

    await linkedRegistration.save();
  }

  return sendSuccess(res, 201, `Student admitted as ${studentType}`, {
    student,
    rscNumber,
    prn,
    admissionSource: selectedMeritList ? "MERIT_LIST" : "DIRECT",
  });
});
