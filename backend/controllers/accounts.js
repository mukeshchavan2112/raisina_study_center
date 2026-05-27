import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";
import asyncHandler from "express-async-handler";

import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { resolveCenterScope } from "../utils/accessControl.js";
import Transaction from "../models/Transaction.js";
import Student from "../models/Student.js";
import OpeningBalance from "../models/OpeningBalance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "expense-evidence");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MONTHS = [
  "Jan",
  "Feb",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ALLOWED_EVIDENCE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const getFileExtension = (file) => {
  const originalExt = path.extname(file.originalname || "").toLowerCase();

  if (originalExt) return originalExt;

  if (file.mimetype === "application/pdf") return ".pdf";
  if (file.mimetype === "image/png") return ".png";
  if (file.mimetype === "image/webp") return ".webp";

  return ".jpg";
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = getFileExtension(file);
    const uniqueName = `expense-${Date.now()}-${crypto
      .randomBytes(8)
      .toString("hex")}${ext}`;

    cb(null, uniqueName);
  },
});

const evidenceFileFilter = (_req, file, cb) => {
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.mimetype)) {
    return cb(new Error("Only image and PDF evidence files are allowed"));
  }

  cb(null, true);
};

export const uploadExpenseEvidence = multer({
  storage,
  fileFilter: evidenceFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("evidence");

const cleanupUploadedFile = (file) => {
  if (!file?.path) return;

  fs.unlink(file.path, () => {});
};

const buildCenterFilter = (req, overrideCenterId = null) => {
  const centerId = resolveCenterScope(req, overrideCenterId);
  return centerId ? { center: centerId } : {};
};

const getCenterIdForWrite = (req, overrideCenterId = null) => {
  return resolveCenterScope(req, overrideCenterId);
};

const getYearRange = (year) => {
  const selectedYear = Number(year) || new Date().getFullYear();

  return {
    selectedYear,
    start: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
    end: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
  };
};

const getMonthRange = (month) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const selectedMonth = /^\d{4}-\d{2}$/.test(month || "")
    ? month
    : currentMonth;

  const [year, monthNumber] = selectedMonth.split("-").map(Number);

  const start = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNumber, 1, 0, 0, 0, 0));

  return {
    selectedMonth,
    start,
    end,
  };
};

const validateAmount = (amount) => {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const validateLedgerAmount = (amount) => {
  const value = Number(amount);
  return Number.isFinite(value) ? value : null;
};

const getTransactionTotal = async (filter) => {
  const transactions = await Transaction.find(filter).select("amount");
  return transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
};

// ─── STUDENT FEES / RECEIPTS ──────────────────────────────

export const collectStudentFee = asyncHandler(async (req, res) => {
  const {
    centerId,
    studentId,
    amount,
    category = "ADMISSION_FEE",
    date,
    paymentMode = "CASH",
    notes,
  } = req.body;

  const finalCenterId = getCenterIdForWrite(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  if (!studentId) {
    return sendError(res, 400, "studentId is required");
  }

  const allowedCategories = [
    "ADMISSION_FEE",
    "STUDENT_FEES",
    "HOSTEL_FEE",
    "MESS_FEE",
    "LIBRARY_FEE",
    "OTHER_FEE",
  ];

  if (!allowedCategories.includes(category)) {
    return sendError(res, 400, "Invalid student fee category");
  }

  const finalAmount = validateAmount(amount);

  if (!finalAmount) {
    return sendError(res, 400, "Amount must be greater than 0");
  }

  const student = await Student.findOne({
    _id: studentId,
    center: finalCenterId,
    deleted: false,
  });

  if (!student) {
    return sendError(res, 404, "Student not found");
  }

  const txnDate = date ? new Date(date) : new Date();

  if (Number.isNaN(txnDate.getTime())) {
    return sendError(res, 400, "Invalid transaction date");
  }

  const txn = await Transaction.create({
    center: finalCenterId,
    type: "CREDIT",
    source: "STUDENT_FEE",
    category,
    amount: finalAmount,
    date: txnDate,
    student: student._id,
    month: txnDate.toISOString().slice(0, 7),
    paymentMode,
    notes,
  });

  const populatedTxn = await Transaction.findById(txn._id)
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber");

  return sendSuccess(res, 201, "Student fee collected", populatedTxn);
});

export const getStudentFees = asyncHandler(async (req, res) => {
  const { from, to, category, studentId, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    source: "STUDENT_FEE",
    deleted: false,
  };

  if (category) filter.category = category;
  if (studentId) filter.student = studentId;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const fees = await Transaction.find(filter)
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber")
    .sort({ date: -1 });

  const totalAmount = fees.reduce((sum, item) => sum + item.amount, 0);

  return sendSuccess(res, 200, "Student fees fetched", {
    fees,
    totalAmount,
  });
});

// ─── DONATIONS / DEPOSITS ─────────────────────────────────

export const addDonation = asyncHandler(async (req, res) => {
  const {
    centerId,
    donorName,
    donorDesignation,
    amount,
    date,
    category = "EXTERNAL_DONATION",
    paymentMode = "CASH",
    notes,
  } = req.body;

  const finalCenterId = getCenterIdForWrite(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  const allowedCategories = [
    "EXTERNAL_DONATION",
    "GRANT",
    "OFFICER",
    "SOBTI",
    "ALUMNI",
    "AMERICA",
    "OTHER",
  ];

  if (!allowedCategories.includes(category)) {
    return sendError(res, 400, "Invalid category for donation/deposit");
  }

  const finalAmount = validateAmount(amount);

  if (!finalAmount) {
    return sendError(res, 400, "Amount must be greater than 0");
  }

  const txnDate = date ? new Date(date) : new Date();

  if (Number.isNaN(txnDate.getTime())) {
    return sendError(res, 400, "Invalid donation date");
  }

  const txn = await Transaction.create({
    center: finalCenterId,
    type: "CREDIT",
    source: category === "GRANT" ? "OTHER_INCOME" : "EXTERNAL_DONATION",
    category,
    amount: finalAmount,
    date: txnDate,
    month: txnDate.toISOString().slice(0, 7),
    donorName,
    donorDesignation,
    paymentMode,
    notes,
  });

  return sendSuccess(res, 201, "Donation/deposit recorded", txn);
});

export const getDonations = asyncHandler(async (req, res) => {
  const { from, to, category, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    source: { $in: ["EXTERNAL_DONATION", "OTHER_INCOME"] },
    deleted: false,
  };

  if (category) filter.category = category;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const donations = await Transaction.find(filter)
    .populate("center", "centerName centerCode city")
    .sort({ date: -1 });

  const totalAmount = donations.reduce((sum, item) => sum + item.amount, 0);

  return sendSuccess(res, 200, "Donations/deposits fetched", {
    donations,
    totalAmount,
  });
});

// ─── EXPENSES ─────────────────────────────────────────────

export const addExpense = asyncHandler(async (req, res) => {
  const {
    centerId,
    amount,
    category,
    date,
    paymentMode = "CASH",
    paidTo,
    notes,
  } = req.body;

  const finalCenterId = getCenterIdForWrite(req, centerId);

  if (!finalCenterId) {
    cleanupUploadedFile(req.file);
    return sendError(res, 400, "centerId is required");
  }

  const expenseCategories = [
    "NEWSPAPER",
    "MAINTENANCE",
    "RAISINA",
    "RENT",
    "LIGHT_BILL",
    "OFFICE_BOY",
    "UTILITIES",
    "SALARIES",
    "MESS_SUPPLIES",
    "OTHER",
  ];

  if (!expenseCategories.includes(category)) {
    cleanupUploadedFile(req.file);
    return sendError(res, 400, "Invalid expense category");
  }

  const finalAmount = validateAmount(amount);

  if (!finalAmount) {
    cleanupUploadedFile(req.file);
    return sendError(res, 400, "Amount must be greater than 0");
  }

  const txnDate = date ? new Date(date) : new Date();

  if (Number.isNaN(txnDate.getTime())) {
    cleanupUploadedFile(req.file);
    return sendError(res, 400, "Invalid expense date");
  }

  const txn = await Transaction.create({
    center: finalCenterId,
    type: "DEBIT",
    source: "EXPENSE",
    category,
    amount: finalAmount,
    date: txnDate,
    month: txnDate.toISOString().slice(0, 7),
    paymentMode,
    paidTo,
    notes,
    evidenceUrl: req.file?.filename || null,
  });

  return sendSuccess(res, 201, "Expense recorded", txn);
});

export const getExpenses = asyncHandler(async (req, res) => {
  const { from, to, category, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    source: "EXPENSE",
    deleted: false,
  };

  if (category) filter.category = category;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const expenses = await Transaction.find(filter)
    .populate("center", "centerName centerCode city")
    .sort({ date: -1 });

  const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

  return sendSuccess(res, 200, "Expenses fetched", {
    expenses,
    totalAmount,
  });
});

export const getExpenseEvidence = asyncHandler(async (req, res) => {
  const txn = await Transaction.findOne({
    _id: req.params.id,
    ...buildCenterFilter(req),
    source: "EXPENSE",
    deleted: false,
  });

  if (!txn) {
    return sendError(res, 404, "Expense not found");
  }

  if (!txn.evidenceUrl) {
    return sendError(res, 404, "No evidence uploaded for this expense");
  }

  const safeFileName = path.basename(txn.evidenceUrl);
  const evidencePath = path.join(UPLOAD_DIR, safeFileName);

  if (!fs.existsSync(evidencePath)) {
    return sendError(res, 404, "Evidence file not found");
  }

  return res.sendFile(evidencePath);
});

// ─── GENERAL LEDGER ───────────────────────────────────────

export const getLedger = asyncHandler(async (req, res) => {
  const { from, to, type, source, centerId } = req.query;

  const filter = {
    ...buildCenterFilter(req, centerId),
    deleted: false,
  };

  if (type) filter.type = type;
  if (source) filter.source = source;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const transactions = await Transaction.find(filter)
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber")
    .sort({ date: -1 });

  const totalCredits = transactions
    .filter((item) => item.type === "CREDIT")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalDebits = transactions
    .filter((item) => item.type === "DEBIT")
    .reduce((sum, item) => sum + item.amount, 0);

  return sendSuccess(res, 200, "Ledger fetched", {
    transactions,
    summary: {
      totalCredits,
      totalDebits,
      netBalance: totalCredits - totalDebits,
    },
  });
});

export const getTransactionById = asyncHandler(async (req, res) => {
  const txn = await Transaction.findOne({
    _id: req.params.id,
    ...buildCenterFilter(req),
    deleted: false,
  })
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber");

  if (!txn) {
    return sendError(res, 404, "Transaction not found");
  }

  return sendSuccess(res, 200, "Transaction fetched", txn);
});

// ─── MONTHLY LEDGER / BALANCE ─────────────────────────────

export const getMonthlyLedger = asyncHandler(async (req, res) => {
  const { month, centerId } = req.query;
  const { selectedMonth, start, end } = getMonthRange(month);

  const centerFilter = buildCenterFilter(req, centerId);

  const manualOpeningBalances = await OpeningBalance.find({
    ...centerFilter,
    month: selectedMonth,
  });

  let openingBalance = 0;
  let openingBalanceMode = "CALCULATED";

  if (manualOpeningBalances.length > 0) {
    openingBalance = manualOpeningBalances.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    openingBalanceMode = "MANUAL";
  } else {
    const pastCredits = await getTransactionTotal({
      ...centerFilter,
      type: "CREDIT",
      deleted: false,
      date: { $lt: start },
    });

    const pastDebits = await getTransactionTotal({
      ...centerFilter,
      type: "DEBIT",
      deleted: false,
      date: { $lt: start },
    });

    openingBalance = pastCredits - pastDebits;
  }

  const deposits = await getTransactionTotal({
    ...centerFilter,
    type: "CREDIT",
    deleted: false,
    date: { $gte: start, $lt: end },
  });

  const expenses = await getTransactionTotal({
    ...centerFilter,
    type: "DEBIT",
    source: "EXPENSE",
    deleted: false,
    date: { $gte: start, $lt: end },
  });

  const closingBalance = openingBalance + deposits - expenses;

  const transactions = await Transaction.find({
    ...centerFilter,
    deleted: false,
    date: { $gte: start, $lt: end },
  })
    .populate("center", "centerName centerCode city")
    .populate("student", "studentName rscNumber mobileNumber")
    .sort({ date: -1 });

  return sendSuccess(res, 200, "Monthly ledger fetched", {
    month: selectedMonth,
    openingBalance,
    openingBalanceMode,
    totalDeposits: deposits,
    totalExpenses: expenses,
    closingBalance,
    transactions,
  });
});

export const saveOpeningBalance = asyncHandler(async (req, res) => {
  const { centerId, month, amount } = req.body;

  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    return sendError(res, 400, "month is required in YYYY-MM format");
  }

  const finalCenterId = getCenterIdForWrite(req, centerId);

  if (!finalCenterId) {
    return sendError(res, 400, "centerId is required");
  }

  const finalAmount = validateLedgerAmount(amount);

  if (finalAmount === null) {
    return sendError(res, 400, "Opening balance must be a valid number");
  }

  const openingBalance = await OpeningBalance.findOneAndUpdate(
    {
      center: finalCenterId,
      month,
    },
    {
      center: finalCenterId,
      month,
      amount: finalAmount,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  return sendSuccess(res, 200, "Opening balance saved", openingBalance);
});

// ─── MONTHLY REPORTS ──────────────────────────────────────

export const getMonthlyDepositSheet = asyncHandler(async (req, res) => {
  const { year, centerId } = req.query;
  const { selectedYear, start, end } = getYearRange(year);

  const centerFilter = buildCenterFilter(req, centerId);

  const creditTransactions = await Transaction.find({
    ...centerFilter,
    type: "CREDIT",
    deleted: false,
    date: { $gte: start, $lte: end },
  });

  const expenseTransactions = await Transaction.find({
    ...centerFilter,
    type: "DEBIT",
    source: "EXPENSE",
    deleted: false,
    date: { $gte: start, $lte: end },
  });

  const rows = MONTHS.map((month) => ({
    month,
    officer: 0,
    sobti: 0,
    alumni: 0,
    studentFees: 0,
    america: 0,
    other: 0,
    expenses: 0,
    balance: 0,
    total: 0,
  }));

  creditTransactions.forEach((txn) => {
    const index = new Date(txn.date).getMonth();
    const amount = Number(txn.amount || 0);

    if (txn.source === "STUDENT_FEE") {
      rows[index].studentFees += amount;
    } else if (txn.category === "OFFICER") {
      rows[index].officer += amount;
    } else if (txn.category === "SOBTI") {
      rows[index].sobti += amount;
    } else if (txn.category === "ALUMNI") {
      rows[index].alumni += amount;
    } else if (txn.category === "AMERICA") {
      rows[index].america += amount;
    } else {
      rows[index].other += amount;
    }

    rows[index].total += amount;
  });

  expenseTransactions.forEach((txn) => {
    const index = new Date(txn.date).getMonth();
    const amount = Number(txn.amount || 0);

    rows[index].expenses += amount;
  });

  rows.forEach((row) => {
    row.balance = row.total - row.expenses;
  });

  const totals = rows.reduce(
    (sum, row) => ({
      officer: sum.officer + row.officer,
      sobti: sum.sobti + row.sobti,
      alumni: sum.alumni + row.alumni,
      studentFees: sum.studentFees + row.studentFees,
      america: sum.america + row.america,
      other: sum.other + row.other,
      expenses: sum.expenses + row.expenses,
      balance: sum.balance + row.balance,
      total: sum.total + row.total,
    }),
    {
      officer: 0,
      sobti: 0,
      alumni: 0,
      studentFees: 0,
      america: 0,
      other: 0,
      expenses: 0,
      balance: 0,
      total: 0,
    }
  );

  return sendSuccess(res, 200, "Monthly deposit sheet fetched", {
    year: selectedYear,
    rows,
    totals,
  });
});

export const getMonthlyExpenditureSheet = asyncHandler(async (req, res) => {
  const { year, centerId } = req.query;
  const { selectedYear, start, end } = getYearRange(year);

  const centerFilter = buildCenterFilter(req, centerId);

  const expenseTransactions = await Transaction.find({
    ...centerFilter,
    type: "DEBIT",
    source: "EXPENSE",
    deleted: false,
    date: { $gte: start, $lte: end },
  });

  const creditTransactions = await Transaction.find({
    ...centerFilter,
    type: "CREDIT",
    deleted: false,
    date: { $gte: start, $lte: end },
  });

  const rows = MONTHS.map((month) => ({
    month,
    newspaper: 0,
    maintenance: 0,
    raisina: 0,
    rent: 0,
    lightBill: 0,
    officeBoy: 0,
    other: 0,
    deposits: 0,
    balance: 0,
    total: 0,
    remark: "",
  }));

  expenseTransactions.forEach((txn) => {
    const index = new Date(txn.date).getMonth();
    const amount = Number(txn.amount || 0);

    if (txn.category === "NEWSPAPER") {
      rows[index].newspaper += amount;
    } else if (txn.category === "MAINTENANCE") {
      rows[index].maintenance += amount;
    } else if (txn.category === "RAISINA") {
      rows[index].raisina += amount;
    } else if (txn.category === "RENT") {
      rows[index].rent += amount;
    } else if (txn.category === "LIGHT_BILL") {
      rows[index].lightBill += amount;
    } else if (txn.category === "OFFICE_BOY") {
      rows[index].officeBoy += amount;
    } else {
      rows[index].other += amount;
    }

    rows[index].total += amount;
  });

  creditTransactions.forEach((txn) => {
    const index = new Date(txn.date).getMonth();
    const amount = Number(txn.amount || 0);

    rows[index].deposits += amount;
  });

  rows.forEach((row) => {
    row.balance = row.deposits - row.total;
  });

  const totals = rows.reduce(
    (sum, row) => ({
      newspaper: sum.newspaper + row.newspaper,
      maintenance: sum.maintenance + row.maintenance,
      raisina: sum.raisina + row.raisina,
      rent: sum.rent + row.rent,
      lightBill: sum.lightBill + row.lightBill,
      officeBoy: sum.officeBoy + row.officeBoy,
      other: sum.other + row.other,
      deposits: sum.deposits + row.deposits,
      balance: sum.balance + row.balance,
      total: sum.total + row.total,
    }),
    {
      newspaper: 0,
      maintenance: 0,
      raisina: 0,
      rent: 0,
      lightBill: 0,
      officeBoy: 0,
      other: 0,
      deposits: 0,
      balance: 0,
      total: 0,
    }
  );

  return sendSuccess(res, 200, "Monthly expenditure sheet fetched", {
    year: selectedYear,
    rows,
    totals,
  });
});