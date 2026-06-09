import AuditLog from "../models/AuditLog.js";

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = ["password", "newPassword", "currentPassword", "confirmPassword", "aadharNumber"];

const sanitizeBody = (body = {}) => {
  const sanitized = { ...body };
  SENSITIVE_FIELDS.forEach((field) => {
    if (field in sanitized) sanitized[field] = "[REDACTED]";
  });
  return sanitized;
};

export const auditLog = async (action, userId, userType, details = {}) => {
  try {
    await AuditLog.create({
      action,
      userId: userId || null,
      userType: userType || "admin",
      ip: details.ip || "unknown",
      statusCode: details.statusCode || null,
      body: sanitizeBody(details.body),
      path: details.path || null,
      method: details.method || null,
    });
  } catch (err) {
    // Audit logging should never crash the app
    console.error("[AUDIT ERROR]", err.message);
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[AUDIT] ${new Date().toISOString()} - ${action} by ${userType} ${userId}`);
  }
};

export const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    if (req.user && req.method !== "GET") {
      auditLog(
        `${req.method} ${req.path}`,
        req.user.id,
        req.user.role || "admin",
        {
          ip: req.ip || req.connection?.remoteAddress,
          statusCode: res.statusCode,
          body: req.body,
          path: req.path,
          method: req.method,
        }
      );
    }
    return originalSend.call(this, data);
  };

  next();
};