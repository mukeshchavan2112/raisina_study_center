import express from "express";
import { protect, authorizeRoles } from "../middleware/auth.js";
import {
  collectStudentFee,
  getStudentFees,
  addDonation,
  getDonations,
  addExpense,
  getExpenses,
  getExpenseEvidence,
  getLedger,
  getTransactionById,
  getMonthlyLedger,
  saveOpeningBalance,
  getMonthlyDepositSheet,
  getMonthlyExpenditureSheet,
  uploadExpenseEvidence,
} from "../controllers/accounts.js";

const router = express.Router();

router.use(protect);

// Student fees / receipts
router.post("/student-fees", authorizeRoles("CENTER_ADMIN"), collectStudentFee);
router.get("/student-fees", getStudentFees);

// Donations / deposits
router.post("/donations", authorizeRoles("CENTER_ADMIN"), addDonation);
router.get("/donations", getDonations);

// Expenses
router.post(
  "/expenses",
  authorizeRoles("CENTER_ADMIN"),
  uploadExpenseEvidence,
  addExpense
);
router.get("/expenses", getExpenses);

// Protected expense evidence route
// Important: keep this BEFORE "/transactions/:id"
router.get("/transactions/:id/evidence", getExpenseEvidence);

// Monthly ledger / balance
router.get("/monthly-ledger", getMonthlyLedger);
router.post(
  "/opening-balance",
  authorizeRoles("CENTER_ADMIN", "SUPER_ADMIN"),
  saveOpeningBalance
);

// Monthly sheets
router.get("/reports/deposit-sheet", getMonthlyDepositSheet);
router.get("/reports/expenditure-sheet", getMonthlyExpenditureSheet);

// General ledger
router.get("/ledger", getLedger);
router.get("/transactions/:id", getTransactionById);

export default router;