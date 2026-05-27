import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },

    type: {
      type: String,
      enum: ["Boys", "Girls", "Other"],
      required: true,
    },

    address: {
      type: String,
      trim: true,
    },

    totalRooms: {
      type: Number,
      required: true,
      min: 1,
    },

    bedsPerRoom: {
      type: Number,
      required: true,
      min: 1,
    },

    // Can be auto-calculated from totalRooms * bedsPerRoom,
    // but can also be edited manually from the Hostel module.
    capacity: {
      type: Number,
      min: 1,
    },

    occupancy: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Legacy/backward-compatible field only.
    // New fee/payment handling must be done from Accounts module.
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

hostelSchema.index({ name: 1, center: 1 }, { unique: true });

// Auto-calculate capacity only when rooms/beds change
// and capacity was not manually provided.
hostelSchema.pre("save", function (next) {
  if (
    (this.isModified("totalRooms") || this.isModified("bedsPerRoom")) &&
    !this.isModified("capacity")
  ) {
    this.capacity = this.totalRooms * this.bedsPerRoom;
  }

  next();
});

export default mongoose.model("Hostel", hostelSchema);