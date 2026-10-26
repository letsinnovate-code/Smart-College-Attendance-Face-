// src/middleware/errorHandler.js
// Centralized error handler. All async errors must be forwarded with next(err).
// Never exposes stack traces in production.
// Returns a consistent JSON shape for all errors.

import { ZodError } from "zod";
import mongoose from "mongoose";
import logger from "../config/logger.js";

// Application error codes — stable strings referenced in tests and client code
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  UNPROCESSABLE: "UNPROCESSABLE",
  INTERNAL: "INTERNAL",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  BAD_REQUEST: "BAD_REQUEST",
  GONE: "GONE",
};

// Custom application error class
export class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = ErrorCode.INTERNAL,
    details = null,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new AppError(message, 400, ErrorCode.BAD_REQUEST, details);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message = "Insufficient permissions") {
    return new AppError(message, 403, ErrorCode.FORBIDDEN);
  }

  static notFound(message = "Resource not found") {
    return new AppError(message, 404, ErrorCode.NOT_FOUND);
  }

  static conflict(message, details = null) {
    return new AppError(message, 409, ErrorCode.CONFLICT, details);
  }

  static unprocessable(message, details = null) {
    return new AppError(message, 422, ErrorCode.UNPROCESSABLE, details);
  }

  static serviceUnavailable(message = "Service temporarily unavailable") {
    return new AppError(message, 503, ErrorCode.SERVICE_UNAVAILABLE);
  }

  static validation(message, errors = []) {
    return new AppError(message, 400, ErrorCode.VALIDATION_ERROR, errors);
  }
}

function formatZodErrors(zodError) {
  return zodError.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

function formatMongooseErrors(mongooseError) {
  return Object.entries(mongooseError.errors || {}).map(([field, err]) => ({
    field,
    message: err.message,
  }));
}

export function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  const requestId = req.requestId || "unknown";
  const isProduction = process.env.NODE_ENV === "production";

  // --- ZodError (request validation failure) ---
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: ErrorCode.VALIDATION_ERROR,
      message: "Request validation failed",
      requestId,
      errors: formatZodErrors(err),
    });
  }

  // --- Mongoose Validation Error ---
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      code: ErrorCode.VALIDATION_ERROR,
      message: "Database validation failed",
      requestId,
      errors: formatMongooseErrors(err),
    });
  }

  // --- MongoDB Duplicate Key Error ---
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      success: false,
      code: ErrorCode.CONFLICT,
      message: `A record with this ${field} already exists`,
      requestId,
    });
  }

  // --- Mongoose Cast Error (invalid ObjectId etc.) ---
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      code: ErrorCode.BAD_REQUEST,
      message: `Invalid value for field: ${err.path}`,
      requestId,
    });
  }

  // --- Multer errors ---
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      code: ErrorCode.UNPROCESSABLE,
      message: "Uploaded file exceeds the size limit",
      requestId,
    });
  }

  // --- Application Error ---
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, "Application error");
    } else {
      logger.warn(
        { code: err.code, message: err.message, requestId },
        "Client error",
      );
    }
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      requestId,
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  // --- JWT / jose errors ---
  if (
    err.name === "JWSInvalid" ||
    err.name === "JWTExpired" ||
    err.name === "JWTClaimValidationFailed"
  ) {
    return res.status(401).json({
      success: false,
      code: ErrorCode.UNAUTHORIZED,
      message: "Invalid or expired token",
      requestId,
    });
  }

  // --- SyntaxError from JSON body parsing ---
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      code: ErrorCode.BAD_REQUEST,
      message: "Malformed JSON in request body",
      requestId,
    });
  }

  // --- Unknown error ---
  logger.error({ err, requestId }, "Unhandled error");
  return res.status(500).json({
    success: false,
    code: ErrorCode.INTERNAL,
    message: "An unexpected error occurred",
    requestId,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

// Wrapper for async route handlers to forward errors to errorHandler
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
