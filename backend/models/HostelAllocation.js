import mongoose from "mongoose";

const hostelAllocationSchema = new mongoose.Schema(
  {
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },

    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
      default: null,
    },

    // Legacy/backward-compatible field only.
    // New fee/payment handling must be done from Accounts module.
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "LEFT"],
      default: "ACTIVE",
    },

    leftDate: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

hostelAllocationSchema.index({
  center: 1,
  hostel: 1,
  roomNumber: 1,
  bedNumber: 1,
});

hostelAllocationSchema.index({
  student: 1,
  status: 1,
});

export default mongoose.model("HostelAllocation", hostelAllocationSchema);