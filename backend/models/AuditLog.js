import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userType: { type: String, default: "admin" },
    ip: { type: String, default: "unknown" },
    statusCode: { type: Number, default: null },
    body: { type: mongoose.Schema.Types.Mixed, default: {} },
    path: { type: String, default: null },
    method: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;