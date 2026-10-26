// src/services/auth.service.js
// Authentication business logic.
// Implements: login, logout, token refresh, password reset, invitation, account management.

import * as jose from "jose";
import * as argon2 from "argon2";
import ms from "ms";
import User from "../models/User.js";
import RefreshSession from "../models/RefreshSession.js";
import AuditLog from "../models/AuditLog.js";
import { AppError } from "../middleware/errorHandler.js";
import { generateSecureToken, hashToken } from "../utils/crypto.js";
import env from "../config/env.js";
import logger from "../config/logger.js";

const ACCESS_SECRET = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(env.REFRESH_TOKEN_SECRET);

// Argon2id configuration (OWASP recommended parameters)
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

// ----- Token helpers -----

export async function signAccessToken(userId, role, collegeId) {
  return new jose.SignJWT({ sub: userId, role, collegeId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("smart-attendance")
    .setAudience("smart-attendance-api")
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(ACCESS_SECRET);
}

async function signRefreshToken(userId) {
  const raw = generateSecureToken(48);
  return raw; // We sign it ourselves; just return the raw token (hash stored in DB)
}

export async function issueTokensForUser({ user, userAgent, ipAddress }) {
  const accessToken = await signAccessToken(
    user._id.toString(),
    user.role,
    user.collegeId?.toString(),
  );
  const rawRefreshToken = generateSecureToken(48);
  const tokenHash = hashToken(rawRefreshToken);
  const ttlMs = ms(env.REFRESH_TOKEN_TTL);

  await RefreshSession.create({
    userId: user._id,
    collegeId: user.collegeId,
    tokenHash,
    userAgent,
    ipAddress,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMs),
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

// ----- Core auth functions -----

export async function login({
  email,
  password,
  userAgent,
  ipAddress,
  requestId,
}) {
  // Use a generic error to avoid user enumeration
  const GENERIC_ERR = AppError.unauthorized("Invalid credentials");

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select("+hashedPassword +failedLoginAttempts +lockedUntil")
    .lean();

  if (!user) {
    await argon2.hash("dummy-prevent-timing", ARGON2_OPTIONS); // Prevent timing attack
    throw GENERIC_ERR;
  }

  // Account lockout check
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw AppError.unauthorized(
      "Account temporarily locked — too many failed attempts",
    );
  }

  // Verify password
  const valid = await argon2.verify(
    user.hashedPassword,
    password,
    ARGON2_OPTIONS,
  );
  if (!valid) {
    await User.updateOne(
      { _id: user._id },
      {
        $inc: { failedLoginAttempts: 1 },
        $set: {
          lockedUntil:
            user.failedLoginAttempts >= 4
              ? new Date(Date.now() + 15 * 60 * 1000) // lock for 15 min after 5 failures
              : null,
        },
      },
    );
    await AuditLog.create({
      actor: user._id,
      action: "auth.login.failed",
      collegeId: user.collegeId,
      requestId,
      metadata: { email: user.email, reason: "invalid_password" },
    });
    throw GENERIC_ERR;
  }

  if (user.accountStatus !== "active") {
    throw AppError.unauthorized("Account is not active");
  }

  // Reset failed attempts
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    },
  );

  // Issue tokens
  const accessToken = await signAccessToken(
    user._id.toString(),
    user.role,
    user.collegeId?.toString(),
  );
  const rawRefreshToken = await signRefreshToken(user._id);
  const tokenHash = hashToken(rawRefreshToken);

  const ttlMs = ms(env.REFRESH_TOKEN_TTL);
  await RefreshSession.create({
    userId: user._id,
    collegeId: user.collegeId,
    tokenHash,
    userAgent,
    ipAddress,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMs),
  });

  await AuditLog.create({
    actor: user._id,
    action: "auth.login.success",
    collegeId: user.collegeId,
    requestId,
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
    },
  };
}

export async function refreshTokens({
  rawRefreshToken,
  userAgent,
  ipAddress,
  requestId,
}) {
  if (!rawRefreshToken)
    throw AppError.unauthorized("No refresh token provided");

  const tokenHash = hashToken(rawRefreshToken);
  const session = await RefreshSession.findOne({ tokenHash }).select(
    "+tokenHash +parentTokenHash",
  );

  if (!session) {
    // Token not found — possible reuse. Cannot identify which session family without the token,
    // so we log and reject.
    logger.warn(
      { requestId },
      "Refresh token not found — possible theft or expired session",
    );
    throw AppError.unauthorized("Invalid refresh token");
  }

  // Reuse detection: if this session is already revoked, someone is reusing an old token.
  if (session.isRevoked || session.revokedAt) {
    // Revoke the entire token family by revoking all sessions for this user
    logger.warn(
      { userId: session.userId, requestId },
      "Refresh token reuse detected — revoking all sessions",
    );
    await RefreshSession.updateMany(
      { userId: session.userId, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: "reuse-detected",
        },
      },
    );
    await AuditLog.create({
      actor: session.userId,
      action: "auth.refresh.reuse",
      collegeId: session.collegeId,
      requestId,
      ipAddress,
      userAgent,
    });
    throw AppError.unauthorized("Session compromised — please log in again");
  }

  if (session.expiresAt < new Date()) {
    await session.deleteOne();
    throw AppError.unauthorized("Refresh token expired — please log in again");
  }

  // Rotate: revoke old session, issue new one
  await RefreshSession.updateOne(
    { _id: session._id },
    {
      $set: { isRevoked: true, revokedAt: new Date(), revokedReason: "logout" },
    },
  );

  const user = await User.findById(session.userId)
    .select("role collegeId email accountStatus")
    .lean();
  if (!user || user.accountStatus !== "active") {
    throw AppError.unauthorized("User account inactive");
  }

  const newRawRefreshToken = await signRefreshToken(user._id);
  const newTokenHash = hashToken(newRawRefreshToken);
  const ttlMs = ms(env.REFRESH_TOKEN_TTL);

  await RefreshSession.create({
    userId: user._id,
    collegeId: user.collegeId,
    tokenHash: newTokenHash,
    parentTokenHash: tokenHash, // Link to parent for reuse-detection chain
    userAgent,
    ipAddress,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMs),
  });

  const accessToken = await signAccessToken(
    user._id.toString(),
    user.role,
    user.collegeId?.toString(),
  );

  await AuditLog.create({
    actor: user._id,
    action: "auth.refresh.success",
    collegeId: user.collegeId,
    requestId,
  });

  return { accessToken, refreshToken: newRawRefreshToken };
}

export async function logout({ rawRefreshToken, userId, requestId }) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshSession.updateOne(
    { tokenHash, userId, isRevoked: false },
    {
      $set: { isRevoked: true, revokedAt: new Date(), revokedReason: "logout" },
    },
  );
  await AuditLog.create({ actor: userId, action: "auth.logout", requestId });
}

export async function logoutAll({ userId, requestId }) {
  await RefreshSession.updateMany(
    { userId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "logout-all",
      },
    },
  );
  await AuditLog.create({
    actor: userId,
    action: "auth.logout.all",
    requestId,
  });
}

export async function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function forgotPassword({ email, requestId }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
  // Always respond generically — do not reveal whether the email exists
  if (!user || user.accountStatus === "suspended") return;

  const token = generateSecureToken(32);
  const tokenHash = hashToken(token);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetToken: tokenHash,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    },
  );

  await AuditLog.create({
    actor: user._id,
    action: "auth.password.reset.requested",
    requestId,
  });

  // Email would be sent here via notification job
  // Return token for local dev only (in production, send via email)
  if (env.NODE_ENV !== "production" && env.EMAIL_PROVIDER === "none") {
    return { devToken: token }; // Never expose in production
  }
}

export async function resetPassword({ token, newPassword, requestId }) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw AppError.badRequest("Invalid or expired reset token");
  }

  const hashedPassword = await hashPassword(newPassword);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        hashedPassword,
        passwordChangedAt: new Date(),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    },
  );

  // Invalidate all refresh sessions
  await RefreshSession.updateMany(
    { userId: user._id, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "logout-all",
      },
    },
  );

  await AuditLog.create({
    actor: user._id,
    action: "auth.password.reset.completed",
    requestId,
  });
}
