// src/middleware/authorize.js
// Role-based and resource-level authorization middleware.
// All access is DENIED by default.

import { AppError } from "./errorHandler.js";

/**
 * Definitions of which roles can perform which high-level actions.
 * Extend this table as new permissions are added.
 */
export const ROLES = {
  superAdmin: "superAdmin",
  collegeAdmin: "collegeAdmin",
  faculty: "faculty",
  student: "student",
  attendanceAuditor: "attendanceAuditor",
};

// Role hierarchy — higher index = higher privilege
const ROLE_LEVEL = {
  student: 0,
  attendanceAuditor: 1,
  faculty: 2,
  collegeAdmin: 3,
  superAdmin: 4,
};

/**
 * requireRoles(...roles)
 * Middleware factory: allows only users whose role is in the list.
 * Always call authenticate() before this middleware.
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Requires one of: ${allowedRoles.join(", ")}`),
      );
    }
    next();
  };
}

/**
 * requireMinRole(minRole)
 * Middleware factory: allows users at or above minRole in the hierarchy.
 */
export function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    const userLevel = ROLE_LEVEL[req.user.role] ?? -1;
    const minLevel = ROLE_LEVEL[minRole] ?? 999;
    if (userLevel < minLevel) {
      return next(AppError.forbidden());
    }
    next();
  };
}

/**
 * requireCollegeScope
 * Ensures the resource being accessed belongs to the authenticated user's college.
 * Compares req.params.collegeId (or req.targetCollegeId set by a prior middleware) against req.user.collegeId.
 * superAdmin bypasses this check.
 */
export function requireCollegeScope(req, res, next) {
  if (!req.user) return next(AppError.unauthorized());
  if (req.user.role === ROLES.superAdmin) return next(); // superAdmin sees all

  const targetCollegeId = req.params.collegeId || req.targetCollegeId;
  if (!targetCollegeId) return next(); // No college scope to check

  if (req.user.collegeId !== targetCollegeId.toString()) {
    return next(
      AppError.forbidden("Access denied: cross-college access prohibited"),
    );
  }
  next();
}

/**
 * requireSelf(paramName)
 * Ensures the user is acting on their own resource.
 * Allows admins and superAdmins to bypass.
 */
export function requireSelf(paramName = "id") {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (
      req.user.role === ROLES.superAdmin ||
      req.user.role === ROLES.collegeAdmin ||
      req.user.role === ROLES.faculty
    ) {
      return next();
    }
    const paramId = req.params[paramName];
    if (req.user.id !== paramId) {
      return next(
        AppError.forbidden(
          "Access denied: cannot access another user's resource",
        ),
      );
    }
    next();
  };
}
