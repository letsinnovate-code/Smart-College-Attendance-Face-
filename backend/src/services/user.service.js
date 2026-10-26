// src/services/user.service.js
// Business logic for user management and invitation workflows.

import User from "../models/User.js";
import College from "../models/College.js";
import AuditLog from "../models/AuditLog.js";
import { AppError } from "../middleware/errorHandler.js";
import { hashPassword } from "./auth.service.js";
import { generateSecureToken, hashToken } from "../utils/crypto.js";
import {
  parsePagination,
  buildPaginationResponse,
} from "../utils/pagination.js";

export async function createUser({ collegeId, data, actor, requestId }) {
  // Validate caller permissions
  if (data.role === "superAdmin" && actor.role !== "superAdmin") {
    throw AppError.forbidden("Only superAdmins can create superAdmin accounts");
  }
  if (data.role === "collegeAdmin" && actor.role !== "superAdmin") {
    throw AppError.forbidden(
      "Only superAdmins can create collegeAdmin accounts",
    );
  }

  const effectiveCollegeId =
    data.role === "superAdmin" ? null : collegeId || data.collegeId;
  if (data.role !== "superAdmin" && !effectiveCollegeId) {
    throw AppError.badRequest(
      "College ID is required for non-superAdmin users",
    );
  }

  // Check email conflict
  const existingUser = await User.findOne({
    email: data.email.toLowerCase().trim(),
    ...(effectiveCollegeId ? { collegeId: effectiveCollegeId } : {}),
  });
  if (existingUser) {
    throw AppError.conflict(
      "A user with this email already exists in this organization",
    );
  }

  const initialPassword = data.password || generateSecureToken(12);
  const hashedPassword = await hashPassword(initialPassword);

  const user = await User.create({
    email: data.email.toLowerCase().trim(),
    hashedPassword,
    role: data.role,
    collegeId: effectiveCollegeId,
    profile: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      studentId: data.studentId,
      employeeId: data.employeeId,
      departmentId: data.departmentId || null,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
    },
    accountStatus: data.accountStatus || "active",
    emailVerified: true, // Admin-created accounts are pre-verified
    invitedBy: actor.id,
  });

  await AuditLog.create({
    actor: actor.id,
    action: "user.created",
    targetType: "User",
    targetId: user._id,
    collegeId: effectiveCollegeId,
    requestId,
    metadata: { email: user.email, role: user.role },
  });

  return { user, initialPassword: data.password ? undefined : initialPassword };
}

export async function listUsers(collegeId, queryParams) {
  const { page, limit, skip, sort } = parsePagination(queryParams, {
    allowedSortFields: ["createdAt", "email", "profile.firstName", "role"],
    defaultSort: "-createdAt",
  });

  const filter = {};
  if (collegeId) filter.collegeId = collegeId;
  if (queryParams.role) filter.role = queryParams.role;
  if (queryParams.accountStatus)
    filter.accountStatus = queryParams.accountStatus;
  if (queryParams.departmentId)
    filter["profile.departmentId"] = queryParams.departmentId;

  if (queryParams.search) {
    filter.$or = [
      { email: { $regex: queryParams.search, $options: "i" } },
      { "profile.firstName": { $regex: queryParams.search, $options: "i" } },
      { "profile.lastName": { $regex: queryParams.search, $options: "i" } },
      { "profile.studentId": { $regex: queryParams.search, $options: "i" } },
      { "profile.employeeId": { $regex: queryParams.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate("collegeId", "name tenantCode")
      .populate("profile.departmentId", "name code")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return buildPaginationResponse(items, total, page, limit);
}

export async function getUserById(collegeId, userId) {
  const query = { _id: userId };
  if (collegeId) query.collegeId = collegeId;

  const user = await User.findOne(query)
    .populate("collegeId", "name tenantCode settings")
    .populate("profile.departmentId", "name code")
    .lean();

  if (!user) throw AppError.notFound("User not found");
  return user;
}

export async function updateUser({
  collegeId,
  userId,
  updateData,
  actor,
  requestId,
}) {
  const query = { _id: userId };
  if (collegeId) query.collegeId = collegeId;

  const user = await User.findOne(query);
  if (!user) throw AppError.notFound("User not found");

  if (updateData.profile) {
    user.profile = { ...user.profile.toObject(), ...updateData.profile };
  }
  if (updateData.accountStatus) {
    user.accountStatus = updateData.accountStatus;
  }
  if (updateData.role && actor.role === "superAdmin") {
    user.role = updateData.role;
  }

  await user.save();

  await AuditLog.create({
    actor: actor.id,
    action: "user.updated",
    targetType: "User",
    targetId: user._id,
    collegeId: user.collegeId,
    requestId,
  });

  return user;
}
