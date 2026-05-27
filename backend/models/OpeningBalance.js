import mongoose from "mongoose";

const openingBalanceSchema = new mongoose.Schema(
  {
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },

    month: {
      type: String, // Format: YYYY-MM
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

openingBalanceSchema.index({ center: 1, month: 1 }, { unique: true });

export default mongoose.model("OpeningBalance", openingBalanceSchema);