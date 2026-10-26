// src/controllers/auth.controller.js
// HTTP layer for authentication. Translates between HTTP and the auth service.

import * as authService from "../services/auth.service.js";
import env from "../config/env.js";
import User from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches REFRESH_TOKEN_TTL default)
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

function getRefreshTokenFromRequest(req) {
  // Prefer HttpOnly cookie; accept body field for clients that cannot use cookies (mobile)
  return req.cookies?.refreshToken || req.body?.refreshToken;
}

export async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login({
    email,
    password,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
    requestId: req.requestId,
  });

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

  res.json({
    success: true,
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
    requestId: req.requestId,
  });
}

export async function refresh(req, res) {
  const rawRefreshToken = getRefreshTokenFromRequest(req);
  const result = await authService.refreshTokens({
    rawRefreshToken,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
    requestId: req.requestId,
  });

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);
  res.json({
    success: true,
    data: { accessToken: result.accessToken },
    requestId: req.requestId,
  });
}

export async function logout(req, res) {
  const rawRefreshToken = getRefreshTokenFromRequest(req);
  await authService.logout({
    rawRefreshToken,
    userId: req.user.id,
    requestId: req.requestId,
  });
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json({
    success: true,
    message: "Logged out successfully",
    requestId: req.requestId,
  });
}

export async function logoutAll(req, res) {
  await authService.logoutAll({
    userId: req.user.id,
    requestId: req.requestId,
  });
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json({
    success: true,
    message: "All sessions invalidated",
    requestId: req.requestId,
  });
}

export async function forgotPassword(req, res) {
  const result = await authService.forgotPassword({
    email: req.body.email,
    requestId: req.requestId,
  });
  // Always return a generic success message
  const data = { message: "If this email exists, a reset link has been sent" };
  // In development with no email provider, return the token for testing
  if (result?.devToken) data.devToken = result.devToken;
  res.json({ success: true, data, requestId: req.requestId });
}

export async function resetPassword(req, res) {
  await authService.resetPassword({
    token: req.body.token,
    newPassword: req.body.newPassword,
    requestId: req.requestId,
  });
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json({
    success: true,
    message: "Password reset successfully",
    requestId: req.requestId,
  });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id)
    .populate("collegeId", "name tenantCode")
    .populate("profile.departmentId", "name code")
    .lean();

  if (!user) throw AppError.notFound("User not found");

  res.json({ success: true, data: user, requestId: req.requestId });
}

export async function registerCollege(req, res) {
  const College = (await import("../models/College.js")).default;
  const AuditLog = (await import("../models/AuditLog.js")).default;
  const {
    collegeName,
    tenantCode,
    domain,
    contactEmail,
    adminFirstName,
    adminLastName,
    adminEmail,
    password,
  } = req.body;

  const upperCode = tenantCode.toUpperCase().trim();
  const existingCollege = await College.findOne({
    $or: [{ tenantCode: upperCode }, ...(domain ? [{ domain: domain.toLowerCase().trim() }] : [])],
  });
  if (existingCollege) {
    throw AppError.conflict("A college with this tenant code or domain already exists");
  }

  const existingUser = await User.findOne({ email: adminEmail.toLowerCase().trim() });
  if (existingUser) {
    throw AppError.conflict("A user with this administrator email already exists");
  }

  const college = await College.create({
    name: collegeName.trim(),
    tenantCode: upperCode,
    domain: domain ? domain.toLowerCase().trim() : undefined,
    contactEmail: contactEmail ? contactEmail.toLowerCase().trim() : adminEmail.toLowerCase().trim(),
    status: "active",
  });

  const hashedPassword = await authService.hashPassword(password);
  const user = await User.create({
    email: adminEmail.toLowerCase().trim(),
    hashedPassword,
    role: "collegeAdmin",
    collegeId: college._id,
    profile: {
      firstName: adminFirstName.trim(),
      lastName: adminLastName.trim(),
    },
    accountStatus: "active",
    emailVerified: true,
  });

  const { accessToken, refreshToken } = await authService.issueTokensForUser({
    user,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

  await AuditLog.create({
    actor: user._id,
    action: "college.created",
    targetType: "College",
    targetId: college._id.toString(),
    collegeId: college._id,
    requestId: req.requestId,
    metadata: { selfRegistered: true },
  });

  res.status(201).json({
    success: true,
    data: {
      college,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        collegeId: college._id,
        profile: user.profile,
        accountStatus: user.accountStatus,
      },
      accessToken,
    },
    requestId: req.requestId,
  });
}

export async function registerStudent(req, res) {
  const College = (await import("../models/College.js")).default;
  const AuditLog = (await import("../models/AuditLog.js")).default;
  const {
    collegeId,
    firstName,
    lastName,
    email,
    password,
    studentId,
    phone,
  } = req.body;

  const college = await College.findById(collegeId);
  if (!college || college.status !== "active") {
    throw AppError.badRequest("Selected college is invalid or not active");
  }

  const existingUser = await User.findOne({
    email: email.toLowerCase().trim(),
    collegeId,
  });
  if (existingUser) {
    throw AppError.conflict("A student with this email already exists in this college");
  }

  const hashedPassword = await authService.hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase().trim(),
    hashedPassword,
    role: "student",
    collegeId,
    profile: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      studentId: studentId?.trim(),
      phone: phone?.trim(),
    },
    accountStatus: "active",
    emailVerified: true,
  });

  const { accessToken, refreshToken } = await authService.issueTokensForUser({
    user,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

  await AuditLog.create({
    actor: user._id,
    action: "user.created",
    targetType: "User",
    targetId: user._id.toString(),
    collegeId,
    requestId: req.requestId,
    metadata: { selfRegistered: true, role: "student" },
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        profile: user.profile,
        accountStatus: user.accountStatus,
      },
      accessToken,
    },
    requestId: req.requestId,
  });
}

export async function getPublicColleges(req, res) {
  const College = (await import("../models/College.js")).default;
  const colleges = await College.find({ status: "active" })
    .select("_id name shortName tenantCode domain settings")
    .sort("name")
    .lean();

  res.json({
    success: true,
    data: colleges,
    requestId: req.requestId,
  });
}
