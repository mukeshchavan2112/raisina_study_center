import mongoose from "mongoose";

const examRegistrationSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    aadhaarEncrypted: {
      type: String,
      required: true,
    },

    aadhaarHash: {
      type: String,
      required: true,
      index: true,
    },

    aadhaarLast4: {
      type: String,
      required: true,
    },

    dob: {
      type: Date,
      required: true,
    },

    addressLine: {
      type: String,
      required: true,
      trim: true,
    },

    // Legacy field kept for compatibility.
    // We will store the exam center here also, so old code keeps working.
    preferredCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },

    // New field: where student wants to give the offline exam
    preferredExamCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      default: null,
    },

    // New field: where student wants admission after merit selection
    preferredAdmissionCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      default: null,
    },

    status: {
      type: String,
      enum: ["REGISTERED", "MERIT_LISTED", "ADMITTED", "CANCELLED"],
      default: "REGISTERED",
    },

    meritRank: {
      type: Number,
      default: null,
    },

    score: {
      type: Number,
      default: null,
    },

    linkedMeritList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeritList",
      default: null,
    },

    linkedStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

examRegistrationSchema.index({ preferredCenter: 1, year: 1 });
examRegistrationSchema.index({ preferredExamCenter: 1, year: 1 });
examRegistrationSchema.index({ preferredAdmissionCenter: 1, year: 1 });
examRegistrationSchema.index({ mobileNumber: 1, year: 1 });
examRegistrationSchema.index({ status: 1 });

export default mongoose.model("ExamRegistration", examRegistrationSchema);
