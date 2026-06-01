import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Center from "../models/Center.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

const signToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      centerId: user.center?._id ?? user.center ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

const buildUserPayload = (user) => {
  const center = user.center || null;

  return {
    id: user._id,
    _id: user._id,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    center,
    centerId: center?._id ?? center ?? null,
    centerName: center?.centerName ?? null,
    centerCode: center?.centerCode ?? null,
    forcePasswordChange: user.forcePasswordChange || false,
    passwordChangedAt: user.passwordChangedAt || null,
  };
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const {
    name,
    firstName,
    lastName,
    email,
    password,
    role = "CENTER_ADMIN",
    center,
    centerId,
    aadharNumber,
  } = req.body;

  if (!email || !password) {
    return sendError(res, 400, "Email and password are required");
  }

  if (password.length < 8) {
    return sendError(res, 400, "Password must be at least 8 characters");
  }

  if (!["SUPER_ADMIN", "CENTER_ADMIN"].includes(role)) {
    return sendError(res, 400, "Invalid user role");
  }

  const existingUser = await User.findOne({
    email: email.toLowerCase(),
    deleted: false,
  });

  if (existingUser) {
    return sendError(res, 400, "User already exists with this email");
  }

  let finalFirstName = firstName;
  let finalLastName = lastName;

  if (!finalFirstName && name) {
    const nameParts = name.trim().split(/\s+/);
    finalFirstName = nameParts[0];
    finalLastName = nameParts.slice(1).join(" ") || "Admin";
  }

  const finalCenterId = centerId || center || null;

  let normalizedAadhaar = null;
  let aadhaarHashForCheck = null;

  if (role === "CENTER_ADMIN") {
    if (!finalCenterId) {
      return sendError(res, 400, "Center admin must be assigned to a center");
    }

    const assignedCenter = await Center.findOne({
      _id: finalCenterId,
      deleted: false,
    });

    if (!assignedCenter) {
      return sendError(res, 404, "Assigned center not found");
    }

    normalizedAadhaar = User.normalizeAadhaar(aadharNumber);

    if (!/^\d{12}$/.test(normalizedAadhaar)) {
      return sendError(res, 400, "Aadhaar number must be exactly 12 digits");
    }

    const tempUser = new User({
      firstName: "Temp",
      lastName: "User",
      email: `temp-${Date.now()}@example.com`,
      password: "temporary-password",
      role: "CENTER_ADMIN",
      center: finalCenterId,
    });

    tempUser.setAadhaarNumber(normalizedAadhaar);
    aadhaarHashForCheck = tempUser.aadharHash;

    const existingAadhaarUser = await User.findOne({
      aadharHash: aadhaarHashForCheck,
      deleted: false,
    }).select("+aadharHash");

    if (existingAadhaarUser) {
      return sendError(
        res,
        400,
        "A center admin already exists with this Aadhaar number"
      );
    }
  }

  const user = new User({
    firstName: finalFirstName || "Center",
    lastName: finalLastName || "Admin",
    email: email.toLowerCase(),
    password,
    role,
    center: role === "CENTER_ADMIN" ? finalCenterId : null,
    forcePasswordChange: false,
    passwordChangedAt: null,
    deleted: false,
  });

  if (role === "CENTER_ADMIN" && normalizedAadhaar) {
    user.setAadhaarNumber(normalizedAadhaar);
  }

  await user.save();

  const populatedUser = await User.findById(user._id).populate(
    "center",
    "centerName centerCode city state"
  );

  const token = signToken(populatedUser);

  return sendSuccess(res, 201, "User registered successfully", {
    token,
    user: buildUserPayload(populatedUser),
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, "Email and password are required");
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    deleted: { $ne: true },
  }).populate("center", "centerName centerCode city state");

  if (!user) {
    return sendError(res, 401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return sendError(res, 401, "Invalid credentials");
  }

  const token = signToken(user);

  return sendSuccess(res, 200, "Login successful", {
    token,
    user: buildUserPayload(user),
  });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("center", "centerName centerCode city state");

  if (!user) {
    return sendError(res, 404, "User not found");
  }

  return sendSuccess(res, 200, "User fetched", buildUserPayload(user));
});

// PUT /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return sendError(
      res,
      400,
      "Current password, new password and confirm password are required",
    );
  }

  if (newPassword !== confirmPassword) {
    return sendError(
      res,
      400,
      "New password and confirm password do not match",
    );
  }

  if (newPassword.length < 8) {
    return sendError(res, 400, "New password must be at least 8 characters");
  }

  if (currentPassword === newPassword) {
    return sendError(
      res,
      400,
      "New password must be different from current password",
    );
  }

  const user = await User.findById(req.user._id).populate(
    "center",
    "centerName centerCode city state",
  );

  if (!user || user.deleted) {
    return sendError(res, 404, "User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    return sendError(res, 401, "Current password is incorrect");
  }

  user.password = newPassword;
  user.forcePasswordChange = false;
  user.passwordChangedAt = new Date();

  await user.save();

  const updatedUser = await User.findById(user._id)
    .select("-password")
    .populate("center", "centerName centerCode city state");

  return sendSuccess(res, 200, "Password changed successfully", {
    user: buildUserPayload(updatedUser),
  });
});

// GET /api/auth/center-admins
export const getCenterAdmins = asyncHandler(async (req, res) => {
  const centerAdmins = await User.find({
    role: "CENTER_ADMIN",
    deleted: false,
  })
    .select("-password")
    .populate("center", "centerName centerCode city state")
    .sort({ createdAt: -1 });

  return sendSuccess(res, 200, "Center admins fetched successfully", {
    users: centerAdmins.map((admin) => buildUserPayload(admin)),
  });
});

// PATCH /api/auth/center-admins/:id/reset-password
export const resetCenterAdminPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return sendError(res, 400, "New password is required");
  }

  if (newPassword.length < 8) {
    return sendError(res, 400, "New password must be at least 8 characters");
  }

  const centerAdmin = await User.findOne({
    _id: req.params.id,
    role: "CENTER_ADMIN",
    deleted: false,
  }).populate("center", "centerName centerCode city state");

  if (!centerAdmin) {
    return sendError(res, 404, "Center admin not found");
  }

  centerAdmin.password = newPassword;
  centerAdmin.forcePasswordChange = true;
  centerAdmin.passwordChangedAt = null;

  await centerAdmin.save();

  return sendSuccess(res, 200, "Center admin password reset successfully. They must change it after next login.", {
    user: buildUserPayload(centerAdmin),
  });
});
