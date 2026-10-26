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
