import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },

    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    source: {
      type: String,
      enum: ["EXTERNAL_DONATION", "STUDENT_FEE", "OTHER_INCOME", "EXPENSE"],
      required: true,
    },

    category: {
      type: String,
      enum: [
        // Student fees / receipts
        "ADMISSION_FEE",
        "STUDENT_FEES",
        "HOSTEL_FEE",
        "MESS_FEE",
        "LIBRARY_FEE",
        "OTHER_FEE",

        // Donations / deposits
        "EXTERNAL_DONATION",
        "GRANT",
        "OFFICER",
        "SOBTI",
        "ALUMNI",
        "AMERICA",
        "OTHER_INCOME",

        // Expenses
        "NEWSPAPER",
        "MAINTENANCE",
        "RAISINA",
        "RENT",
        "LIGHT_BILL",
        "OFFICE_BOY",
        "UTILITIES",
        "SALARIES",
        "MESS_SUPPLIES",

        // Common fallback
        "OTHER",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    donorName: {
      type: String,
      default: null,
      trim: true,
    },

    donorDesignation: {
      type: String,
      default: null,
      trim: true,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"],
      default: "CASH",
    },

    paidTo: {
      type: String,
      default: null,
      trim: true,
    },

    month: {
      type: String,
      default: null,
    },

    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    // For expense proof/evidence.
    // Store only relative/internal path or filename.
    // Do not expose this as public static URL.
    evidenceUrl: {
      type: String,
      default: null,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ center: 1, date: -1 });
transactionSchema.index({ center: 1, source: 1 });
transactionSchema.index({ center: 1, category: 1 });
transactionSchema.index({ center: 1, type: 1, date: -1 });
transactionSchema.index({ center: 1, month: 1 });

transactionSchema.pre("save", async function (next) {
  if (!this.receiptNumber) {
    const year = new Date(this.date).getFullYear();

    const count = await mongoose.model("Transaction").countDocuments({
      center: this.center,
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    });

    const centerDoc = await mongoose
      .model("Center")
      .findById(this.center)
      .select("centerCode");

    const code = centerDoc?.centerCode || "XX";

    this.receiptNumber = `${code}-${year}-${String(count + 1).padStart(
      5,
      "0"
    )}`;
  }

  next();
});

export default mongoose.model("Transaction", transactionSchema);