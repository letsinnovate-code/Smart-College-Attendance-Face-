// src/middleware/authenticate.js
// Verifies the JWT access token from the Authorization header.
// Attaches the decoded user context (id, role, collegeId) to req.user.
// Does NOT touch refresh tokens — those are handled in the auth service.

import * as jose from "jose";
import { AppError } from "./errorHandler.js";
import env from "../config/env.js";
import User from "../models/User.js";

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);

/**
 * Middleware: require a valid Bearer JWT.
 * Attaches req.user = { id, role, collegeId, email }.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("No access token provided");
    }

    const token = authHeader.slice(7);

    const { payload } = await jose.jwtVerify(token, ACCESS_TOKEN_SECRET, {
      issuer: "smart-attendance",
      audience: "smart-attendance-api",
      algorithms: ["HS256"],
    });

    // Verify the user still exists and is active (not suspended)
    // This check adds a DB round-trip but prevents revoked users from continuing to use old tokens.
    // Cache this in Redis (TTL = ACCESS_TOKEN_TTL) in production for performance.
    const user = await User.findById(payload.sub)
      .select("role collegeId email accountStatus")
      .lean();
    if (!user) {
      throw AppError.unauthorized("User account not found");
    }
    if (user.accountStatus !== "active") {
      throw AppError.unauthorized("Account is suspended or deactivated");
    }

    req.user = {
      id: payload.sub,
      role: user.role,
      collegeId: user.collegeId?.toString(),
      email: user.email,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    // jose errors (invalid token, expired, tampered signature, etc.)
    if (
      err instanceof jose.errors.JOSEError ||
      err.code?.startsWith("ERR_J") ||
      err.name?.startsWith("J")
    ) {
      return next(AppError.unauthorized("Invalid or expired access token"));
    }
    next(err);
  }
}

/**
 * Middleware: optionally attach user context if a token is present.
 * Does not fail if no token is provided.
 */
export async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  return authenticate(req, res, next);
}
