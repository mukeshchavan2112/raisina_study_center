import mongoose from 'mongoose';

const logbookSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    center: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true },
    month: { type: String, required: true }, // 'YYYY-MM'
    services: {
      hostel: { type: Boolean, default: false },
      mess: { type: Boolean, default: false },
      library: { type: Boolean, default: false },
    },
    fees: {
      hostel: { type: Number, default: 0 },
      mess: { type: Number, default: 0 },
      library: { type: Number, default: 0 },
    },
    totalAmount: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    receiptNumber: { type: String, default: null },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes
logbookSchema.index({ student: 1, month: 1 }, { unique: true });
logbookSchema.index({ center: 1, month: 1 });

// Auto-calculate totalAmount before save
logbookSchema.pre('save', function (next) {
  this.totalAmount =
    (this.services.hostel ? this.fees.hostel : 0) +
    (this.services.mess ? this.fees.mess : 0) +
    (this.services.library ? this.fees.library : 0);
  next();
});

export default mongoose.model('Logbook', logbookSchema);