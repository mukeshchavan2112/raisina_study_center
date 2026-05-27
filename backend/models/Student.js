import mongoose from "mongoose";

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
      index: true,
    },

    prn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
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

    aadharNumber: {
      type: String,
      trim: true,
    },

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
  { timestamps: true },
);

studentSchema.index({ center: 1, studentType: 1 });
studentSchema.index({ center: 1, admissionDate: -1 });
studentSchema.index({ rscNumber: 1 });
studentSchema.index({ prn: 1 });

const Student = mongoose.model("Student", studentSchema);

export default Student;
