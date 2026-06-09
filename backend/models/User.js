import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

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

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },

    lastName: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "CENTER_ADMIN"],
      required: true,
    },

    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      default: null,
    },

    // Aadhaar is stored safely.
    // Full Aadhaar is never stored as plain text.
    aadharNumberEncrypted: {
      type: String,
      select: false,
      default: null,
    },

    aadharLast4: {
      type: String,
      select: false,
      default: null,
    },

    aadharHash: {
      type: String,
      select: false,
      default: null,
    },

    forcePasswordChange: {
      type: Boolean,
      default: false,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.aadharNumberEncrypted;
        delete ret.aadharHash;

        if (ret.aadharLast4) {
          ret.maskedAadharNumber = maskAadhaar(ret.aadharLast4);
        }

        delete ret.aadharLast4;

        return ret;
      },
    },
  }
);

userSchema.methods.setAadhaarNumber = function (aadhaarNumber) {
  const normalized = normalizeAadhaar(aadhaarNumber);

  if (!normalized) return;

  if (!/^\d{12}$/.test(normalized)) {
    throw new Error("Aadhaar number must be exactly 12 digits");
  }

  this.aadharNumberEncrypted = encryptAadhaar(normalized);
  this.aadharLast4 = normalized.slice(-4);
  this.aadharHash = hashAadhaar(normalized);
};

userSchema.statics.normalizeAadhaar = normalizeAadhaar;
userSchema.statics.maskAadhaar = maskAadhaar;

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Enforce CENTER_ADMIN must have a center
userSchema.pre("save", function (next) {
  if (this.role === "CENTER_ADMIN" && !this.center) {
    return next(new Error("CENTER_ADMIN must be assigned to a center"));
  }

  if (this.role === "SUPER_ADMIN" && this.center) {
    this.center = null;
  }

  next();
});

userSchema.index({ role: 1, center: 1 });
userSchema.index({ aadharHash: 1 }, { unique: true, sparse: true });

const User = mongoose.model("User", userSchema);

export default User;