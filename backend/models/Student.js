import mongoose from "mongoose";
import crypto from "crypto";

// ── Aadhaar helpers ──────────────────────────────────────────────────────────

const normalizeAadhaar = (value) => {
  return String(value || "").replace(/\D/g, "");
};

const maskAadhaar = (last4) => {
  if (!last4) return "";
  return `XXXX XXXX ${last4}`;
};

const getEncryptionKey = () => {
  const secret = process.env.AADHAAR_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AADHAAR_ENCRYPTION_KEY must be set in .env and should be at least 32 characters"
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
};

const encryptAadhaar = (plainText) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString(
    "hex"
  )}`;
};

const hashAadhaar = (plainText) => {
  const pepper = process.env.AADHAAR_HASH_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error(
      "AADHAAR_HASH_PEPPER must be set in .env and should be at least 16 characters"
    );
  }
  return crypto
    .createHash("sha256")
    .update(`${plainText}:${pepper}`)
    .digest("hex");
};

// ── Schemas ──────────────────────────────────────────────────────────────────

const addressSchema = new mongoose.Schema(
  {
    addressType: {
      type: String,
      enum: ["HOME", "LOCAL", "PERMANENT"],
      required: true,
    },
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const studentSchema = new mongoose.Schema(
  {
    // Auto-generated identifiers
    rscNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    prn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },

    studentName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      trim: true,
    },

    parentMobileNumber: {
      type: String,
      trim: true,
    },

    dob: {
      type: Date,
    },

    aadharNumberEncrypted: { type: String, default: null },
    aadharLast4: { type: String, default: null },
    aadharHash: { type: String, default: null, select: false },

    addresses: [addressSchema],

    education: {
      type: String,
      trim: true,
    },

    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    hobbies: {
      type: String,
      trim: true,
    },

    qualifyExams: [
      {
        type: String,
        trim: true,
      },
    ],

    targetedPost: {
      type: String,
      trim: true,
    },

    aimOfLife: {
      type: String,
      trim: true,
    },

    studentType: {
      type: String,
      enum: ["SCHOLARSHIP", "NON_SCHOLARSHIP"],
      required: true,
      default: "NON_SCHOLARSHIP",
    },

    meritRank: {
      type: Number,
      default: null,
    },

    scholarshipPercentage: {
      type: Number,
      default: null,
    },

    admissionDate: {
      type: Date,
      default: Date.now,
    },

    // These are facility requirements selected during admission
    facilities: {
      mess: {
        type: Boolean,
        default: false,
      },
      hostel: {
        type: Boolean,
        default: false,
      },
      library: {
        type: Boolean,
        default: false,
      },
    },

    // These are actual allocation references, assigned later
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      default: null,
    },

    mess: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      default: null,
    },

    // Library access can be enabled during admission or later
    libraryAccess: {
      type: Boolean,
      default: false,
    },

    libraryProfile: {
      isAssigned: {
        type: Boolean,
        default: false,
      },

      joiningDate: {
        type: Date,
        default: null,
      },

      startDate: {
        type: Date,
        default: null,
      },

      endDate: {
        type: Date,
        default: null,
      },

      seatNo: {
        type: String,
        trim: true,
        default: "",
      },

      monthlyFee: {
        type: Number,
        default: 0,
        min: 0,
      },

      status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "COMPLETED"],
        default: "ACTIVE",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete ret.aadharNumberEncrypted;
      delete ret.aadharHash;
      if (ret.aadharLast4) {
        ret.maskedAadharNumber = `XXXX XXXX ${ret.aadharLast4}`;
      }
      delete ret.aadharLast4;
      return ret;
    }
  }
}
);

// ── Instance methods & statics (AFTER studentSchema is defined) ──────────────

studentSchema.methods.setAadhaarNumber = function (aadhaarNumber) {
  const normalized = normalizeAadhaar(aadhaarNumber);
  if (!normalized) return;
  if (!/^\d{12}$/.test(normalized)) throw new Error("Aadhaar number must be exactly 12 digits");
  this.aadharNumberEncrypted = encryptAadhaar(normalized);
  this.aadharLast4 = normalized.slice(-4);
  this.aadharHash = hashAadhaar(normalized);
};
studentSchema.statics.normalizeAadhaar = normalizeAadhaar;

// ── Indexes ───────────────────────────────────────────────────────────────────

studentSchema.index({ center: 1, studentType: 1 });
studentSchema.index({ center: 1, admissionDate: -1 });

const Student = mongoose.model("Student", studentSchema);

export default Student;
